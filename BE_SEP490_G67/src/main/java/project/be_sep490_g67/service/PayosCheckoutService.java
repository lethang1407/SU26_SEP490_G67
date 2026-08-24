package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.CheckoutSessionResponse;
import project.be_sep490_g67.entity.PayosCheckoutSession;
import project.be_sep490_g67.enums.PayosPaymentStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.PayosCheckoutSessionRepository;
import vn.payos.PayOS;
import vn.payos.exception.TooManyRequestsException;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

@Service
@Slf4j
@RequiredArgsConstructor
public class PayosCheckoutService {

    /**
     * PayOS chặn cứng description ở 25 ký tự.
     */
    private static final int MAX_DESCRIPTION_LENGTH = 25;
    private static final int ORDER_CODE_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PayOS payOS;
    private final PayosCheckoutSessionRepository sessionRepository;
    private final SalesOrderQuoteService salesOrderQuoteService;
    private final PayosRateLimitService payosRateLimitService;

    @Value("${payos.return-url}")
    private String returnUrl;

    @Value("${payos.cancel-url}")
    private String cancelUrl;

    @Value("${payos.expiry-minutes:15}")
    private int expiryMinutes;

    @Value("${payos.sync-min-interval-seconds:5}")
    private int syncMinIntervalSeconds;

    /**
     * Thời gian tối đa chịu xếp hàng chờ suất gọi, cho các đường thu ngân đang đợi.
     */
    @Value("${payos.rate-limit.max-wait-ms:2000}")
    private long rateLimitMaxWaitMs;

    /**
     * Sau khi PayOS trả 429 thì set thời gian chờ.
     */
    @Value("${payos.rate-limit.cooldown-seconds:5}")
    private int rateLimitCooldownSeconds;

    /**
     * Số lần thử cho đường tạo link
     */
    @Value("${payos.retry.create-attempts:3}")
    private int createAttempts;

    @Value("${payos.retry.settle-attempts:2}")
    private int settleAttempts;

    @Value("${payos.retry.initial-backoff-ms:400}")
    private long initialBackoffMs;

    @Transactional
    public CheckoutSessionResponse createSession(CreateSalesOrderRequest cart, Integer staffId) {
        BigDecimal total = salesOrderQuoteService.quoteTotal(cart);
        if (total.signum() <= 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }
        long amount = total.setScale(0, RoundingMode.HALF_UP).longValueExact();

        PayosCheckoutSession session = new PayosCheckoutSession();
        session.setPayosOrderCode(nextOrderCode());
        session.setAmount(BigDecimal.valueOf(amount));
        session.setStatus(PayosPaymentStatus.PENDING);
        session.setDescription(buildDescription(session.getPayosOrderCode()));
        session.setCreatedBy(staffId);
        session.setUpdatedBy(staffId);
        session.setCreatedAt(Instant.now());
        session.setUpdatedAt(Instant.now());
        sessionRepository.saveAndFlush(session);

        Instant fallbackExpiry = Instant.now().plusSeconds(expiryMinutes * 60L);

        try {
            CreatePaymentLinkResponse link = callGateway(
                    "tạo link " + session.getPayosOrderCode(),
                    () -> payOS.paymentRequests().create(
                            CreatePaymentLinkRequest.builder()
                                    .orderCode(session.getPayosOrderCode())
                                    .amount(amount)
                                    .description(session.getDescription())
                                    .returnUrl(returnUrl)
                                    .cancelUrl(cancelUrl)
                                    .expiredAt(fallbackExpiry.getEpochSecond())
                                    .build()),
                    createAttempts,
                    Duration.ofMillis(rateLimitMaxWaitMs));

            session.setPaymentLinkId(link.getPaymentLinkId());
            session.setQrCode(link.getQrCode());
            session.setCheckoutUrl(link.getCheckoutUrl());
            session.setBin(link.getBin());
            session.setAccountNumber(link.getAccountNumber());
            session.setAccountName(link.getAccountName());
            session.setExpiredAt(link.getExpiredAt() != null
                    ? Instant.ofEpochSecond(link.getExpiredAt())
                    : fallbackExpiry);
            session.setStatus(mapStatus(link.getStatus(), PayosPaymentStatus.PENDING));
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
        } catch (Exception e) {

            session.setStatus(PayosPaymentStatus.FAILED);
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
            log.error("Tạo link thanh toán PayOS thất bại cho phiên {}", session.getPayosOrderCode(), e);

            if (e instanceof AppException appException) {
                throw appException;
            }
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }

        return toResponse(session);
    }

    /**
     * Trạng thái hiện tại của phiên. Phiên chưa chốt thì hỏi lại PayOS, nhờ vậy POS
     * vẫn biết tiền đã về kể cả khi webhook không tới được.
     */
    @Transactional
    public CheckoutSessionResponse getStatus(Long payosOrderCode) {
        PayosCheckoutSession session = requireSession(payosOrderCode);
        if (!session.getStatus().isTerminal()) {
            refreshFromGateway(session, false);
        }
        return toResponse(session);
    }

    /**
     * Thu ngân đóng khung QR khi khách đổi ý.
     */
    @Transactional
    public CheckoutSessionResponse cancel(Long payosOrderCode, String reason) {
        PayosCheckoutSession session = requireSession(payosOrderCode);

        if (session.getStatus() == PayosPaymentStatus.PAID || session.getSalesOrderId() != null) {
            throw new AppException(ErrorCode.PAYMENT_SESSION_NOT_CANCELLABLE);
        }
        if (session.getStatus().isTerminal()) {
            return toResponse(session);
        }

        try {

            callGateway(
                    "hủy link " + session.getPayosOrderCode(),
                    () -> payOS.paymentRequests().cancel(
                            session.getPayosOrderCode(),
                            reason != null && !reason.isBlank() ? reason : "Thu ngan huy thanh toan"),
                    1,
                    Duration.ZERO);
        } catch (Exception e) {
            log.warn("Không hủy được link PayOS {} — vẫn đóng phiên phía hệ thống",
                    session.getPayosOrderCode(), e);
        }

        session.setStatus(PayosPaymentStatus.CANCELLED);
        session.setUpdatedAt(Instant.now());
        return toResponse(sessionRepository.save(session));
    }

    /**
     * Xử lý webhook PayOS. Chữ ký đã được SDK kiểm trong {@code webhooks().verify} để check data
     */
    @Transactional
    public WebhookData handleWebhook(Object rawBody) {
        WebhookData data = payOS.webhooks().verify(rawBody);
        if (data == null || data.getOrderCode() == null) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_WEBHOOK);
        }

        sessionRepository.lockByPayosOrderCode(data.getOrderCode()).ifPresentOrElse(
                session -> {
                    if (!session.getStatus().isTerminal() && "00".equals(data.getCode())) {
                        markPaid(session, data.getReference());
                    }
                },
                () -> log.warn("Webhook PayOS cho mã {} nhưng không có phiên tương ứng",
                        data.getOrderCode()));

        return data;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String consume(Long payosOrderCode, BigDecimal orderTotal, Integer salesOrderId) {
        PayosCheckoutSession session = sessionRepository.lockByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_SESSION_NOT_FOUND));

        if (session.getSalesOrderId() != null) {
            throw new AppException(ErrorCode.PAYMENT_SESSION_ALREADY_USED);
        }
        if (session.getStatus() != PayosPaymentStatus.PAID) {
            refreshFromGateway(session, true);
        }
        if (session.getStatus() != PayosPaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_NOT_COMPLETED);
        }

        BigDecimal charged = session.getAmount().setScale(0, RoundingMode.HALF_UP);
        BigDecimal due = orderTotal.setScale(0, RoundingMode.HALF_UP);
        if (charged.compareTo(due) != 0) {
            log.error("Lệch tiền phiên PayOS {}: đã thu {} nhưng đơn cần {}",
                    payosOrderCode, charged, due);
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        session.setSalesOrderId(salesOrderId);
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);

        return session.getPaymentReference();
    }

    private PayosCheckoutSession requireSession(Long payosOrderCode) {
        return sessionRepository.findByPayosOrderCode(payosOrderCode)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_SESSION_NOT_FOUND));
    }

    private void refreshFromGateway(PayosCheckoutSession session, boolean force) {
        if (!force && !isSyncDue(session)) {
            return;
        }

        PaymentLink link;
        try {
            link = callGateway(
                    "trạng thái link " + session.getPayosOrderCode(),
                    () -> payOS.paymentRequests().get(session.getPayosOrderCode()),
                    force ? settleAttempts : 1,
                    force ? Duration.ofMillis(rateLimitMaxWaitMs) : Duration.ZERO);
        } catch (AppException e) {
            markSynced(session);
            if (force) {
                throw e;
            }
            log.debug("Bỏ một nhịp đồng bộ phiên PayOS {} vì đang giữ nhịp gọi",
                    session.getPayosOrderCode());
            return;
        } catch (Exception e) {
            log.warn("Không lấy được trạng thái link PayOS {}", session.getPayosOrderCode(), e);
            markSynced(session);
            return;
        }

        markSynced(session);
        PayosPaymentStatus status = mapStatus(link.getStatus(), session.getStatus());
        if (status == PayosPaymentStatus.PAID) {
            String reference = link.getTransactions() != null && !link.getTransactions().isEmpty()
                    ? link.getTransactions().get(0).getReference()
                    : null;
            markPaid(session, reference);
            return;
        }

        if (status != session.getStatus()) {
            session.setStatus(status);
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);
        }
    }

    private void markPaid(PayosCheckoutSession session, String reference) {
        session.setStatus(PayosPaymentStatus.PAID);
        session.setPaidAt(Instant.now());
        if (reference != null) {
            session.setPaymentReference(reference);
        }
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);
    }

    private boolean isSyncDue(PayosCheckoutSession session) {
        Instant lastSynced = session.getLastSyncedAt();
        return lastSynced == null
                || lastSynced.plusSeconds(syncMinIntervalSeconds).isBefore(Instant.now());
    }

    private void markSynced(PayosCheckoutSession session) {
        session.setLastSyncedAt(Instant.now());
        sessionRepository.save(session);
    }

    private <T> T callGateway(String operation, Supplier<T> call, int attempts, Duration maxWait) {
        int totalAttempts = Math.max(1, attempts);

        for (int attempt = 1; attempt <= totalAttempts; attempt++) {
            if (!payosRateLimitService.acquire(maxWait)) {
                log.warn("Bỏ qua lời gọi PayOS ({}) vì đang giữ nhịp gọi ra", operation);
                throw new AppException(ErrorCode.PAYMENT_GATEWAY_RATE_LIMITED);
            }

            try {
                return call.get();
            } catch (TooManyRequestsException e) {
                payosRateLimitService.penalize(Duration.ofSeconds(rateLimitCooldownSeconds));

                if (attempt == totalAttempts) {
                    log.error("PayOS trả 429 sau {} lần thử ({})", totalAttempts, operation);
                    throw new AppException(ErrorCode.PAYMENT_GATEWAY_RATE_LIMITED);
                }

                long backoffMs = initialBackoffMs * (1L << (attempt - 1));
                log.warn("PayOS trả 429 ({}), thử lại lần {}/{} sau {}ms",
                        operation, attempt + 1, totalAttempts, backoffMs);
                sleep(backoffMs);
            }
        }

        throw new AppException(ErrorCode.PAYMENT_GATEWAY_RATE_LIMITED);
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_RATE_LIMITED);
        }
    }

    private static PayosPaymentStatus mapStatus(PaymentLinkStatus status, PayosPaymentStatus fallback) {
        if (status == null) {
            return fallback;
        }
        return switch (status) {
            case PAID -> PayosPaymentStatus.PAID;
            case PENDING -> PayosPaymentStatus.PENDING;
            case PROCESSING -> PayosPaymentStatus.PROCESSING;
            case UNDERPAID -> PayosPaymentStatus.UNDERPAID;
            case CANCELLED -> PayosPaymentStatus.CANCELLED;
            case EXPIRED -> PayosPaymentStatus.EXPIRED;
            case FAILED -> PayosPaymentStatus.FAILED;
        };
    }

    private Long nextOrderCode() {
        for (int attempt = 0; attempt < ORDER_CODE_ATTEMPTS; attempt++) {
            long candidate = Instant.now().getEpochSecond() * 1000L + RANDOM.nextInt(1000);
            if (sessionRepository.findByPayosOrderCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
    }

    private static String buildDescription(Long orderCode) {
        String text = "POS " + orderCode;
        return text.length() > MAX_DESCRIPTION_LENGTH
                ? text.substring(0, MAX_DESCRIPTION_LENGTH)
                : text;
    }

    private static CheckoutSessionResponse toResponse(PayosCheckoutSession session) {
        return CheckoutSessionResponse.builder()
                .payosOrderCode(session.getPayosOrderCode())
                .paymentLinkId(session.getPaymentLinkId())
                .amount(session.getAmount())
                .status(session.getStatus())
                .qrCode(session.getQrCode())
                .checkoutUrl(session.getCheckoutUrl())
                .bin(session.getBin())
                .accountNumber(session.getAccountNumber())
                .accountName(session.getAccountName())
                .description(session.getDescription())
                .paymentReference(session.getPaymentReference())
                .expiredAt(session.getExpiredAt())
                .paidAt(session.getPaidAt())
                .salesOrderId(session.getSalesOrderId())
                .build();
    }
}
