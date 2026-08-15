package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.DebtPaymentRequest;
import project.be_sep490_g67.dto.response.CustomerDebtOverviewResponse;
import project.be_sep490_g67.dto.response.CustomerDebtSummaryResponse;
import project.be_sep490_g67.dto.response.DebtPaymentHistoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.TodaysDebtPaymentSummaryResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.entity.DebtPayment;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CustomerRepository;
import project.be_sep490_g67.repository.DebtPaymentRepository;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.utils.DebtCalculator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DebtPaymentService {

    private final DebtPaymentRepository debtPaymentRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final DebtPolicy debtPolicy;

    @Transactional(readOnly = true)
    public CustomerDebtOverviewResponse getDebtOverview() {

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

        LocalDate today = LocalDate.now(zoneId);

        Instant startOfDay = today
                .atStartOfDay(zoneId)
                .toInstant();

        Instant endOfDay = today
                .plusDays(1)
                .atStartOfDay(zoneId)
                .toInstant();

        List<SalesOrder> todaysDebtSales = salesOrderRepository.findActiveDebtSalesCreatedBetween(startOfDay, endOfDay);

        BigDecimal totalDebtAmountIncurredToday = todaysDebtSales.stream()
                .map(this::calculateRemainingDebtAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long uniqueCustomersInDebtCount = todaysDebtSales.stream()
                .map(SalesOrder::getCustomer)
                .filter(Objects::nonNull)
                .map(Customer::getId)
                .distinct()
                .count();

        return CustomerDebtOverviewResponse.builder()
                .totalDebt(customerRepository.getTotalDebt())
                .debtCustomerCount(customerRepository.countInDebtCustomers())
                .todayCollectedAmount(
                        debtPaymentRepository.getTodayCollectedAmount(
                                startOfDay,
                                endOfDay
                        )
                )
                .totalDebtSalesCount(todaysDebtSales.size())
                .uniqueCustomersInDebtCount(uniqueCustomersInDebtCount)
                .totalDebtAmountIncurredToday(totalDebtAmountIncurredToday)
                .build();
    }

    /**
     * Số tiền hoá đơn còn nợ, tính từ collection {@code debtPayments} đã nạp sẵn trên
     * entity thay vì bắn thêm một query như {@link DebtPolicy#remainingOf}. Công thức
     * vẫn là công thức chung ở {@link DebtCalculator} — chỉ khác nguồn lấy tổng đã trả.
     *
     * <p>Phiếu {@code RETURN_OFFSET} (cấn trừ hàng trả) cũng nằm trong collection này và
     * cố ý được đếm: về mặt công nợ nó giảm nợ y hệt một lần khách trả tiền, chỉ khác là
     * không có tiền vào két. Đừng thêm bộ lọc theo {@code paymentMethod} ở đây.
     */
    private BigDecimal calculateRemainingDebtAmount(SalesOrder salesOrder) {
        return DebtCalculator.remaining(
                salesOrder.getTotalAmount(),
                salesOrder.getPaidAmount(),
                settledPayments(salesOrder));
    }

    private BigDecimal settledPayments(SalesOrder salesOrder) {
        return salesOrder.getDebtPayments().stream()
                .filter(dp -> !Boolean.TRUE.equals(dp.getIsRemoved()))
                .map(dp -> dp.getAmountPaid() != null ? dp.getAmountPaid() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public CustomerDebtSummaryResponse getDebtSummary() {
        long inDebtCount = customerRepository.countInDebtCustomers();
        long debtFreeCount = customerRepository.countDebtFreeCustomers();
        return new CustomerDebtSummaryResponse(inDebtCount, debtFreeCount);
    }

    @Transactional
    public DebtPaymentHistoryResponse createDebtPayment(DebtPaymentRequest request) {
        // 1. Find the sales order
        SalesOrder salesOrder = salesOrderRepository.findById(request.getSalesOrderId())
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        // 2. Validate the payment
        if (!Boolean.TRUE.equals(salesOrder.getIsDebt())) {
            throw new AppException(ErrorCode.ORDER_IS_NOT_A_DEBT_ORDER);
        }

        if (request.getAmountPaid() == null
                || request.getAmountPaid().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        // Bản cũ lấy `totalAmount - SUM(debtPayments)`, bỏ qua paidAmount và không lọc
        // phiếu đã huỷ: đơn 1.000k trả trước 300k bị coi là còn nợ đủ 1.000k nên thu quá
        // 300k vẫn lọt. Dùng công thức chung để mọi chỗ hiển thị và chỗ chặn khớp nhau.
        BigDecimal remainingAmount = calculateRemainingDebtAmount(salesOrder);

        if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED);
        }
        if (request.getAmountPaid().compareTo(remainingAmount) > 0) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT);
        }

        // 3. Create and save the debt payment record
        DebtPayment debtPayment = new DebtPayment();
        debtPayment.setSalesOrder(salesOrder);
        debtPayment.setAmountPaid(request.getAmountPaid());
        debtPayment.setPaymentMethod(request.getPaymentMethod().name());
        debtPayment.setNotes(request.getNote());
        if (request.getPaymentDate() != null) {
            debtPayment.setCreatedAt(request.getPaymentDate());
        }

        DebtPayment savedPayment = debtPaymentRepository.save(debtPayment);

        // 4. Update customer's total debt — cùng một lối trừ nợ với đường cấn trừ hàng
        // trả (ExchangeOrderService), gồm cả việc sàn ở 0 và hạ trạng thái về NO_DEBT.
        Customer customer = salesOrder.getCustomer();
        debtPolicy.reduceCustomerDebt(customer, request.getAmountPaid());

        // 5. Build and return the response
        // getAuthentication() có thể null (job nền, test). Tên nhân viên chỉ để hiển thị
        // trên phiếu, không đáng để cả giao dịch thu nợ đổ vì thiếu nó.
        String staffName = "N/A";
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;
        if (principal instanceof User) {
            staffName = ((User) principal).getFullName();
        }

        return DebtPaymentHistoryResponse.builder()
                .id(savedPayment.getId())
                .paymentDate(savedPayment.getCreatedAt())
                .amountPaid(savedPayment.getAmountPaid())
                .note(savedPayment.getNotes())
                .customerName(customer.getFullName())
                .customerId(customer.getId())
                .orderCode(salesOrder.getOrderCode())
                .paymentMethod(savedPayment.getPaymentMethod())
                .orderId(salesOrder.getId())
                .staffName(staffName)
                .build();
    }


    @Transactional(readOnly = true)
    public PageResponse<DebtPaymentHistoryResponse> getDebtPaymentHistory(
            LocalDate startDate, LocalDate endDate, Integer customerId,
            Integer staffId, String keyword, Integer page, Integer size
    ) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant startInstant = startDate != null ? startDate.atStartOfDay(zoneId).toInstant() : null;
        Instant endInstant = endDate != null ? endDate.plusDays(1).atStartOfDay(zoneId).toInstant() : null;

        Page<DebtPayment> debtPaymentPage = debtPaymentRepository.searchDebtPayments(
                startInstant, endInstant, customerId, staffId, keyword, pageable
        );

        List<DebtPaymentHistoryResponse> responses = debtPaymentPage.getContent().stream().map(dp -> {
            String staffName = "N/A";
            if (dp.getCreatedBy() != null) {
                staffName = userRepository.findById(dp.getCreatedBy())
                        .map(User::getFullName)
                        .orElse("Không rõ");
            }

            return DebtPaymentHistoryResponse.builder()
                    .id(dp.getId())
                    .paymentDate(dp.getCreatedAt())
                    .amountPaid(dp.getAmountPaid())
                    .note(dp.getNotes())
                    .customerName(dp.getSalesOrder().getCustomer().getFullName())
                    .customerId(dp.getSalesOrder().getCustomer().getId())
                    .orderCode(dp.getSalesOrder().getOrderCode())
                    .paymentMethod(dp.getPaymentMethod())
                    .orderId(dp.getSalesOrder().getId())
                    .staffName(staffName)
                    .build();
        }).collect(Collectors.toList());

        return PageResponse.<DebtPaymentHistoryResponse>builder()
                .content(responses)
                .page(page)
                .size(size)
                .totalElements(debtPaymentPage.getTotalElements())
                .totalPages(debtPaymentPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<TodaysDebtPaymentSummaryResponse> getTodaysDebtPayments(int page, int size) {
        ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDate today = LocalDate.now(zoneId);
        Instant startOfDay = today.atStartOfDay(zoneId).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(zoneId).toInstant();

        List<DebtPayment> todaysDebtPayments = debtPaymentRepository.findActiveTodayPaymentsWithOrderAndCustomer(
                startOfDay,
                endOfDay
        );

        Map<Integer, TodaysDebtPaymentSummaryResponse> groupedByCustomer = new LinkedHashMap<>();

        todaysDebtPayments.forEach(dp -> {
            SalesOrder salesOrder = dp.getSalesOrder();
            Customer customer = salesOrder != null ? salesOrder.getCustomer() : null;
            Integer customerId = customer != null ? customer.getId() : null;

            TodaysDebtPaymentSummaryResponse customerGroup = groupedByCustomer.computeIfAbsent(
                    customerId,
                    id -> TodaysDebtPaymentSummaryResponse.builder()
                            .customerId(id)
                            .customerName(customer != null ? customer.getFullName() : null)
                            .debtPaymentDetails(new ArrayList<>())
                            .build()
            );

            customerGroup.getDebtPaymentDetails().add(buildDebtPaymentHistoryResponse(dp));
        });

        List<TodaysDebtPaymentSummaryResponse> groupedResponses = new ArrayList<>(groupedByCustomer.values());
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        int fromIndex = Math.min((safePage - 1) * safeSize, groupedResponses.size());
        int toIndex = Math.min(fromIndex + safeSize, groupedResponses.size());

        return PageResponse.<TodaysDebtPaymentSummaryResponse>builder()
                .content(groupedResponses.subList(fromIndex, toIndex))
                .page(safePage)
                .size(safeSize)
                .totalElements(groupedResponses.size())
                .totalPages((int) Math.ceil((double) groupedResponses.size() / safeSize))
                .build();
    }

    private DebtPaymentHistoryResponse buildDebtPaymentHistoryResponse(DebtPayment dp) {
        SalesOrder salesOrder = dp.getSalesOrder();
        Customer customer = salesOrder != null ? salesOrder.getCustomer() : null;

        String staffName = "N/A";
        if (dp.getCreatedBy() != null) {
            staffName = userRepository.findById(dp.getCreatedBy())
                    .map(User::getFullName)
                    .orElse("KhÃ´ng rÃµ");
        }

        return DebtPaymentHistoryResponse.builder()
                .id(dp.getId())
                .paymentDate(dp.getCreatedAt())
                .amountPaid(dp.getAmountPaid())
                .note(dp.getNotes())
                .customerName(customer != null ? customer.getFullName() : null)
                .customerId(customer != null ? customer.getId() : null)
                .orderCode(salesOrder != null ? salesOrder.getOrderCode() : null)
                .paymentMethod(dp.getPaymentMethod())
                .orderId(salesOrder != null ? salesOrder.getId() : null)
                .staffName(staffName)
                .build();
    }
}
