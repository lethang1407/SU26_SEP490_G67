package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateExchangeOrderRequest;
import project.be_sep490_g67.dto.response.ExchangeOrderDetailResponse;
import project.be_sep490_g67.dto.response.ExchangeOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.enums.ResolutionType;
import project.be_sep490_g67.enums.SalesOrderStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;
import project.be_sep490_g67.utils.ResolvedReturnLine;
import project.be_sep490_g67.utils.UnitPriceResolver;
import project.be_sep490_g67.utils.UnitQuantityConverter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ExchangeOrderService {

    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    DocumentCodeService documentCodeService;
    SalesOrderRepository salesOrderRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    ReturnOrderRepository returnOrderRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    ProductRepository productRepository;
    StockBatchRepository stockBatchRepository;
    StockMovementRepository stockMovementRepository;
    ProductUnitRepository productUnitRepository;
    StoreConfigRepository storeConfigRepository;
    BatchLocationRepository batchLocationRepository;
    StorageLocationRepository storageLocationRepository;
    DebtPaymentRepository debtPaymentRepository;
    DebtPolicy debtPolicy;
    PayosCheckoutService payosCheckoutService;

    @Transactional(readOnly = true)
    public ExchangeOrderDetailResponse getOrderForExchange(Integer orderId) {
        SalesOrder order = salesOrderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        Map<Integer, Integer> returnedByLine = returnedQuantityByLine(orderId);

        ExchangeOrderDetailResponse.CustomerInfo customerInfo = null;
        if (order.getCustomer() != null) {
            customerInfo = ExchangeOrderDetailResponse.CustomerInfo.builder()
                    .id(order.getCustomer().getId())
                    .fullName(order.getCustomer().getFullName())
                    .phoneNumber(order.getCustomer().getPhoneNumber())
                    .build();
        }

        List<ExchangeOrderDetailResponse.OrderItemInfo> items = order.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .map(detail -> {
                    Product product = detail.getProduct();
                    int alreadyReturned = returnedByLine.getOrDefault(detail.getId(), 0);
                    return ExchangeOrderDetailResponse.OrderItemInfo.builder()
                            .salesOrderDetailId(detail.getId())
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode()
                                    : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName(detail.getUnitName())
                            .quantityPurchased(detail.getQuantity())
                            .quantityReturned(alreadyReturned)
                            .quantityReturnable(detail.getQuantity() - alreadyReturned)
                            .productReturnable(product.getIsReturnable() == null
                                    || product.getIsReturnable())
                            .unitPrice(detail.getUnitPrice())
                            .lineTotal(detail.getLineTotal())
                            .build();
                })
                .collect(Collectors.toList());

        Instant now = Instant.now();
        BigDecimal debtRemaining = debtPolicy.remainingOf(order);
        Instant deadline = returnDeadline(order);

        return ExchangeOrderDetailResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod())
                .orderStatus(order.getOrderStatus())
                .createdAt(order.getCreatedAt())
                .customer(customerInfo)
                .items(items)
                .isDebt(Boolean.TRUE.equals(order.getIsDebt()))
                .dueDate(order.getDueDate())
                .paidAmount(order.getPaidAmount())
                .debtRemaining(debtRemaining)
                .debtOverdue(debtPolicy.isOverdue(order, now))
                .returnWindowExpired(deadline != null && now.isAfter(deadline))
                .returnDeadline(deadline)
                .build();
    }

    /**
     * Process exchange order - handle returns and new purchases
     */
    @Transactional
    public ExchangeOrderResponse processExchangeOrder(
            CreateExchangeOrderRequest request,
            Integer staffId) {

        // Validate original order exists
        SalesOrder originalOrder = salesOrderRepository.findByIdWithDetails(request.getOriginalOrderId())
                .orElseThrow(() -> new AppException(ErrorCode.ORIGINAL_ORDER_NOT_FOUND));
        Map<Integer, Integer> returnedByLine = returnedQuantityByLine(originalOrder.getId());
        List<ResolvedReturnLine> resolvedLines = resolveReturnLines(request.getReturnItems(), originalOrder,
                returnedByLine);

        assertWithinReturnWindow(originalOrder);
        assertDebtNotOverdue(originalOrder);
        // Sai hình thức hoàn tiền thì chặn trước khi đụng vào kho. Chiều còn lại
        // (TRANSFER mà thiếu mã) phải đợi tính xong tiền mới biết, chặn ở dưới.
        if (!isTransferRefund(request) && request.getPayosOrderCode() != null) {
            throw new AppException(ErrorCode.PAYMENT_METHOD_NOT_TRANSFER);
        }
        ReturnOrder returnOrder = new ReturnOrder();
        returnOrder.setSalesOrder(originalOrder);
        returnOrder.setReturnCode(documentCodeService.generate(DocumentType.CREDIT_NOTE));
        returnOrder.setReturnReason(request.getReturnNote());
        returnOrder.setNote(request.getReturnNote());
        returnOrder.setCreatedBy(staffId);
        returnOrder.setUpdatedBy(staffId);
        returnOrder.setCreatedAt(Instant.now());
        returnOrder.setUpdatedAt(Instant.now());
        returnOrder.setIsRemoved(false);

        // Calculate return amounts.
        BigDecimal returnSubtotal = BigDecimal.ZERO;
        List<ReturnOrderDetail> returnDetails = new ArrayList<>();

        for (ResolvedReturnLine line : resolvedLines) {
            SalesOrderDetail soldLine = line.soldLine();

            BigDecimal unitPrice = soldLine.getUnitPrice();
            BigDecimal lineRefund = unitPrice.multiply(BigDecimal.valueOf(line.quantity()));

            ReturnOrderDetail detail = new ReturnOrderDetail();
            detail.setReturnOrder(returnOrder);
            detail.setProduct(soldLine.getProduct());
            detail.setSalesOrderDetail(soldLine);
            detail.setProductUnit(soldLine.getProductUnit());
            detail.setUnitName(soldLine.getUnitName());
            detail.setQuantity(line.quantity());
            detail.setUnitPrice(unitPrice);
            detail.setLineRefund(lineRefund);
            detail.setResolutionType(line.resolution().name());
            detail.setItemCondition(line.condition().name());
            detail.setNote(line.itemNote());
            // Hàng bán lại được đã về thẳng kho bán nên coi như xử lý xong ngay. Hàng
            // lỗi đưa về khu đổi trả, admin sẽ đánh dấu để có hướng xử lý.
            if (line.condition().isSellable()) {
                detail.setProcessedAt(Instant.now());
                detail.setProcessedBy(staffId);
            }
            detail.setCreatedBy(staffId);
            detail.setUpdatedBy(staffId);
            detail.setCreatedAt(Instant.now());
            detail.setUpdatedAt(Instant.now());
            detail.setIsRemoved(false);

            returnDetails.add(detail);
            returnSubtotal = returnSubtotal.add(lineRefund);
        }

        BigDecimal returnDiscount = request.getReturnDiscount() != null
                ? request.getReturnDiscount()
                : BigDecimal.ZERO;
        BigDecimal totalReturnAmount = returnSubtotal.subtract(returnDiscount);
        returnOrder.setRefundAmount(totalReturnAmount);

        // Save return order first to get ID
        ReturnOrder savedReturnOrder = returnOrderRepository.save(returnOrder);
        returnDetails.forEach(d -> d.setReturnOrder(savedReturnOrder));
        for (ResolvedReturnLine line : resolvedLines) {
            addStockBack(
                    line.soldLine(),
                    UnitQuantityConverter.toBaseUnits(line.soldLine().getProductUnit(),
                            line.quantity()),
                    line.condition(),
                    savedReturnOrder.getId(),
                    staffId);
        }

        BigDecimal exchangeSubtotal = BigDecimal.ZERO;
        List<SalesOrderDetail> exchangeDetails = new ArrayList<>();
        SalesOrder exchangeOrder = null;
        Map<String, SalesOrderDetail> exchangeLinesByRef = new HashMap<>();

        if (request.getExchangeItems() != null && !request.getExchangeItems().isEmpty()) {
            exchangeOrder = createExchangeOrder(originalOrder, staffId);

            for (CreateExchangeOrderRequest.ExchangeItemRequest exchangeItem : request.getExchangeItems()) {
                Product product = productRepository.findById(exchangeItem.getProductId())
                        .orElseThrow(() -> new AppException(
                                ErrorCode.RETURN_PRODUCT_NOT_FOUND));
                ProductUnit resolvedUnit = null;
                String resolvedUnitName;

                if (exchangeItem.getProductUnitId() != null) {
                    resolvedUnit = productUnitRepository.findById(exchangeItem.getProductUnitId())
                            .orElseThrow(() -> new AppException(
                                    ErrorCode.PRODUCT_UNIT_NOT_FOUND));
                    resolvedUnitName = resolvedUnit.getName();
                } else {
                    resolvedUnit = product.getProductUnits().stream()
                            .filter(u -> u.getUnitBase() != null
                                    && u.getUnitBase()
                                    .compareTo(BigDecimal.ONE) == 0)
                            .findFirst()
                            .orElse(null);
                    resolvedUnitName = resolvedUnit != null ? resolvedUnit.getName() : null;
                }

                int baseQuantity = UnitQuantityConverter.toBaseUnits(resolvedUnit,
                        exchangeItem.getQuantity());

                // Resolve batch
                Integer resolvedBatchId = exchangeItem.getBatchId();
                StockBatch batch;

                if (resolvedBatchId == null || resolvedBatchId <= 0) {
                    batch = stockBatchRepository
                            .findFirstAvailableBatchByProductId(exchangeItem.getProductId())
                            .orElseThrow(() -> new AppException(
                                    ErrorCode.NO_AVAILABLE_STOCK_BATCH));
                    resolvedBatchId = batch.getId();
                } else {
                    batch = stockBatchRepository.findById(resolvedBatchId)
                            .orElseThrow(() -> new AppException(
                                    ErrorCode.STOCK_BATCH_NOT_FOUND));
                }

                // Check stock availability
                int currentStock = stockMovementRepository
                        .sumQuantityDeltaByBatchId(resolvedBatchId);
                if (currentStock < baseQuantity) {
                    throw new AppException(ErrorCode.INSUFFICIENT_STOCK);
                }

                // Deduct stock
                StockMovement movement = new StockMovement();
                movement.setStockBatch(batch);
                movement.setMovementType("SALE");
                movement.setReferenceType("EXCHANGE_ORDER");
                movement.setReferenceId(savedReturnOrder.getId());
                movement.setQuantityDelta(-baseQuantity);
                movement.setStockAfter(currentStock - baseQuantity);
                movement.setCreatedBy(staffId);
                movement.setCreatedAt(Instant.now());
                stockMovementRepository.save(movement);

                BigDecimal exchangeUnitPrice = UnitPriceResolver.resolve(product, resolvedUnit);

                BigDecimal lineDiscount = exchangeItem.getDiscountAmount() != null
                        ? exchangeItem.getDiscountAmount()
                        : BigDecimal.ZERO;
                BigDecimal lineTotal = exchangeUnitPrice
                        .multiply(BigDecimal.valueOf(exchangeItem.getQuantity()))
                        .subtract(lineDiscount);

                SalesOrderDetail detail = new SalesOrderDetail();
                detail.setSalesOrder(exchangeOrder);
                detail.setProduct(product);
                detail.setProductUnit(resolvedUnit);
                detail.setUnitName(resolvedUnitName);
                detail.setQuantity(exchangeItem.getQuantity());
                detail.setUnitPrice(exchangeUnitPrice);
                detail.setDiscountAmount(lineDiscount);
                detail.setLineTotal(lineTotal);
                detail.setCreatedBy(staffId);
                detail.setUpdatedBy(staffId);
                detail.setCreatedAt(Instant.now());
                detail.setUpdatedAt(Instant.now());
                detail.setIsRemoved(false);

                exchangeDetails.add(detail);
                exchangeSubtotal = exchangeSubtotal.add(lineTotal);

                if (exchangeItem.getRef() != null) {
                    exchangeLinesByRef.put(exchangeItem.getRef(), detail);
                }
            }

            salesOrderDetailRepository.saveAll(exchangeDetails);

            exchangeOrder.setSubtotal(exchangeSubtotal);
            exchangeOrder.setTotalAmount(exchangeSubtotal.subtract(
                    request.getExchangeDiscount() != null
                            ? request.getExchangeDiscount()
                            : BigDecimal.ZERO));
            exchangeOrder.setDiscountAmount(request.getExchangeDiscount() != null
                    ? request.getExchangeDiscount()
                    : BigDecimal.ZERO);
            salesOrderRepository.save(exchangeOrder);
        }

        assertPairingValid(resolvedLines, returnDetails, exchangeLinesByRef);
        returnOrderDetailRepository.saveAll(returnDetails);

        BigDecimal exchangeDiscount = request.getExchangeDiscount() != null
                ? request.getExchangeDiscount()
                : BigDecimal.ZERO;
        BigDecimal totalExchangeAmount = exchangeSubtotal.subtract(exchangeDiscount);
        BigDecimal netAmount = totalReturnAmount.subtract(totalExchangeAmount);

        DebtSettlement settlement = settleAgainstDebt(
                originalOrder,
                savedReturnOrder,
                exchangeOrder,
                totalReturnAmount,
                totalExchangeAmount,
                request.getDebtPaymentAmount(),
                staffId);

        settleTransferSession(request, settlement, exchangeOrder, originalOrder);

        savedReturnOrder.setDebtOffsetAmount(settlement.debtOffset());
        savedReturnOrder.setCashRefundAmount(settlement.cashRefund());
        returnOrderRepository.save(savedReturnOrder);

        originalOrder.setOrderStatus(deriveOrderStatus(originalOrder).name());
        originalOrder.setUpdatedBy(staffId);
        originalOrder.setUpdatedAt(Instant.now());
        salesOrderRepository.save(originalOrder);

        return buildExchangeOrderResponse(
                savedReturnOrder,
                originalOrder,
                resolvedLines,
                exchangeDetails,
                returnSubtotal,
                returnDiscount,
                totalReturnAmount,
                exchangeSubtotal,
                exchangeDiscount,
                totalExchangeAmount,
                netAmount,
                request.getRefundMethod(),
                settlement,
                exchangeOrder);
    }

    private static boolean isTransferRefund(CreateExchangeOrderRequest request) {
        return "TRANSFER".equalsIgnoreCase(request.getRefundMethod());
    }

    /**
     * Chốt phiên chuyển khoản của phần tiền khách bù thêm, NGAY TRONG giao dịch này.
     *
     * <p>Số tiền đối chiếu là toàn bộ tiền khách đưa tại quầy cho phiếu này
     * ({@code cashCollect + debtPaymentCollected}) — đúng con số POS đã dựng lên mã QR.
     * Lệch một đồng là {@code consume} ném lỗi và cả phiếu lẫn phần trừ kho cùng bị
     * cuộn lại, thay vì ghi một phiếu không khớp tiền đã thu.
     *
     * <p>Phiên được gắn vào đơn đổi (đơn bán sinh ra từ hàng lấy mới). Trường hợp
     * hiếm không có đơn đổi — tiền thu hoàn toàn là khách trả thêm nợ cũ — thì gắn vào
     * chính hóa đơn gốc, là chứng từ mà khoản nợ đó thuộc về.
     */
    private void settleTransferSession(
            CreateExchangeOrderRequest request,
            DebtSettlement settlement,
            SalesOrder exchangeOrder,
            SalesOrder originalOrder) {

        BigDecimal cashIn = settlement.cashCollect().add(settlement.debtPaymentCollected());
        boolean transferCollect = isTransferRefund(request) && cashIn.compareTo(BigDecimal.ZERO) > 0;

        if (!transferCollect) {
            // Hoàn tiền cho khách, hoặc phiếu không phát sinh tiền thu: không có phiên nào để chốt.
            if (request.getPayosOrderCode() != null) {
                throw new AppException(ErrorCode.PAYMENT_METHOD_NOT_TRANSFER);
            }
            return;
        }
        if (request.getPayosOrderCode() == null) {
            throw new AppException(ErrorCode.PAYMENT_REFERENCE_REQUIRED);
        }

        SalesOrder target = exchangeOrder != null ? exchangeOrder : originalOrder;
        String reference = payosCheckoutService.consume(
                request.getPayosOrderCode(), cashIn, target.getId());

        if (exchangeOrder != null) {
            exchangeOrder.setPaymentMethod("TRANSFER");
            exchangeOrder.setPayosOrderCode(request.getPayosOrderCode());
            exchangeOrder.setPaymentReference(reference);
            salesOrderRepository.save(exchangeOrder);
        }
    }

    /**
     * Kết quả quyết toán tiền của một phiếu đổi/trả. Mỗi con số ở đây đều được in ra phiếu
     * hoặc hiện trên màn hình, nên chúng được trả về nguyên vẹn thay vì để phía gọi tự suy lại.
     */
    public record DebtSettlement(
            /** Nợ còn lại của hóa đơn gốc trước khi quyết toán. */
            BigDecimal remainingBefore,
            /** Phần giá trị hàng trả được trừ thẳng vào nợ hóa đơn gốc. */
            BigDecimal debtOffset,
            /** Phần credit dùng để trả cho hàng đổi ra. */
            BigDecimal exchangeCredit,
            /** Tiền mặt hoàn cho khách. */
            BigDecimal cashRefund,
            /** Tiền khách bù thêm ngay tại quầy cho hàng đổi đắt hơn — chỉ với đơn thường. */
            BigDecimal cashCollect,
            /** Phần chênh được ghi nợ trên đơn đổi — chỉ với đơn còn nợ. */
            BigDecimal newDebtOnExchange,
            /** Tiền khách chủ động trả thêm cho nợ cũ tại màn đổi trả. */
            BigDecimal debtPaymentCollected,
            /** Nợ của hóa đơn gốc sau khi đã cấn trừ và thu thêm. */
            BigDecimal remainingAfter) {
    }

    private DebtSettlement settleAgainstDebt(
            SalesOrder originalOrder,
            ReturnOrder returnOrder,
            SalesOrder exchangeOrder,
            BigDecimal returnAmount,
            BigDecimal exchangeAmount,
            BigDecimal requestedDebtPayment,
            Integer staffId) {

        Instant now = Instant.now();
        Customer customer = originalOrder.getCustomer();
        BigDecimal remaining = debtPolicy.remainingOf(originalOrder);

        BigDecimal debtOffset = remaining.min(returnAmount);
        BigDecimal credit = returnAmount.subtract(debtOffset);
        BigDecimal exchangeCredit = credit.min(exchangeAmount);
        BigDecimal cashRefund = credit.subtract(exchangeCredit);
        BigDecimal shortfall = exchangeAmount.subtract(exchangeCredit);

        Instant dueDate = originalOrder.getDueDate();
        boolean canExtendDebt = remaining.compareTo(BigDecimal.ZERO) > 0
                && dueDate != null
                && dueDate.isAfter(now);

        BigDecimal newDebtOnExchange = canExtendDebt ? shortfall : BigDecimal.ZERO;
        BigDecimal cashCollect = canExtendDebt ? BigDecimal.ZERO : shortfall;

        BigDecimal remainingAfterOffset = remaining.subtract(debtOffset);
        BigDecimal debtPayment = resolveDebtPayment(requestedDebtPayment, remainingAfterOffset);

        // --- Kiểm tra trước khi ghi ---
        if (newDebtOnExchange.compareTo(BigDecimal.ZERO) > 0) {
            debtPolicy.validateDebtSale(customer, dueDate, now);
        }

        // --- Ghi ---
        if (debtOffset.compareTo(BigDecimal.ZERO) > 0) {
            writeDebtPayment(originalOrder, debtOffset, "RETURN_OFFSET",
                    "Cấn trừ hàng trả " + returnOrder.getReturnCode(), staffId);
            debtPolicy.reduceCustomerDebt(customer, debtOffset);
        }
        // khách trả thêm được ghi SAU bước cấn trừ, nên số nợ nó đối chiếu là số đã
        // trừ hàng trả rồi.
        if (debtPayment.compareTo(BigDecimal.ZERO) > 0) {
            writeDebtPayment(originalOrder, debtPayment, "CASH",
                    "Khách trả thêm tại phiếu " + returnOrder.getReturnCode(), staffId);
            debtPolicy.reduceCustomerDebt(customer, debtPayment);
        }

        if (exchangeOrder != null) {
            exchangeOrder.setPaidAmount(exchangeCredit.add(cashCollect));
            exchangeOrder.setIsDebt(newDebtOnExchange.compareTo(BigDecimal.ZERO) > 0);
            if (newDebtOnExchange.compareTo(BigDecimal.ZERO) > 0) {
                exchangeOrder.setDueDate(dueDate);
            }
            salesOrderRepository.save(exchangeOrder);
            debtPolicy.addToCustomerDebt(customer, newDebtOnExchange);
        }

        return new DebtSettlement(
                remaining,
                debtOffset,
                exchangeCredit,
                cashRefund,
                cashCollect,
                newDebtOnExchange,
                debtPayment,
                remainingAfterOffset.subtract(debtPayment));
    }

    /**
     * Tiền khách trả thêm không được vượt phần nợ còn lại sau khi đã cấn trừ hàng trả.
     */
    private BigDecimal resolveDebtPayment(BigDecimal requested, BigDecimal remainingAfterOffset) {
        if (requested == null || requested.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (requested.compareTo(remainingAfterOffset) > 0) {
            throw new AppException(ErrorCode.DEBT_PAYMENT_EXCEEDS_REMAINING);
        }
        return requested;
    }

    private void writeDebtPayment(SalesOrder order, BigDecimal amount, String method,
                                  String note, Integer staffId) {
        DebtPayment payment = new DebtPayment();
        payment.setCustomer(order.getCustomer());
        payment.setSalesOrder(order);
        payment.setAmountPaid(amount);
        payment.setPaymentMethod(method);
        payment.setNotes(note);
        debtPaymentRepository.save(payment);
    }

    /**
     * Đơn nợ đã quá hạn trả nợ thì không được đổi/trả.
     */
    private void assertDebtNotOverdue(SalesOrder order) {
        if (debtPolicy.isOverdue(order, Instant.now())) {
            throw new AppException(ErrorCode.RETURN_ORDER_HAS_OVERDUE_DEBT);
        }
    }

    /**
     * Ghi chu rong va ghi chu toan khoang trang deu la "khong co ghi chu".
     */
    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private SalesOrder createExchangeOrder(SalesOrder originalOrder, Integer staffId) {
        SalesOrder exchangeOrder = new SalesOrder();
        exchangeOrder.setCustomer(originalOrder.getCustomer());
        exchangeOrder.setOrderCode(documentCodeService.generate(DocumentType.EXCHANGE_INVOICE));
        exchangeOrder.setOriginalSalesOrderId(originalOrder.getId());
        exchangeOrder.setOrderStatus(SalesOrderStatus.COMPLETED.name());
        exchangeOrder.setPaymentMethod(originalOrder.getPaymentMethod());
        exchangeOrder.setIsDebt(false);
        exchangeOrder.setSubtotal(BigDecimal.ZERO);
        exchangeOrder.setDiscountAmount(BigDecimal.ZERO);
        exchangeOrder.setTotalAmount(BigDecimal.ZERO);
        exchangeOrder.setPaidAmount(BigDecimal.ZERO);
        exchangeOrder.setNote("Đổi hàng từ " + originalOrder.getOrderCode());
        exchangeOrder.setCreatedBy(staffId);
        exchangeOrder.setUpdatedBy(staffId);
        exchangeOrder.setCreatedAt(Instant.now());
        exchangeOrder.setUpdatedAt(Instant.now());
        exchangeOrder.setIsRemoved(false);
        return salesOrderRepository.save(exchangeOrder);
    }

    /**
     * Kiểm tra việc ghép cặp "dòng trả <-> dòng đổi ra" của một phiếu.
     */
    private void assertPairingValid(
            List<ResolvedReturnLine> resolvedLines,
            List<ReturnOrderDetail> returnDetails,
            Map<String, SalesOrderDetail> exchangeLinesByRef) {

        Set<String> usedRefs = new HashSet<>();

        for (int i = 0; i < resolvedLines.size(); i++) {
            ResolvedReturnLine line = resolvedLines.get(i);
            ReturnOrderDetail detail = returnDetails.get(i);
            String ref = line.pairedExchangeItemRef();

            if (!line.resolution().requiresPairing()) {
                if (ref != null) {
                    throw new AppException(ErrorCode.PAIRING_NOT_ALLOWED_FOR_RESOLUTION);
                }
                continue;
            }

            if (ref == null) {
                throw new AppException(ErrorCode.EXCHANGE_REQUIRES_PAIRING);
            }
            if (!usedRefs.add(ref)) {
                throw new AppException(ErrorCode.PAIRED_ITEM_ALREADY_USED);
            }

            SalesOrderDetail replacement = exchangeLinesByRef.get(ref);
            if (replacement == null) {
                throw new AppException(ErrorCode.PAIRED_ITEM_NOT_FOUND);
            }

            if (line.resolution() == ResolutionType.EXCHANGE_EVEN
                    && detail.getLineRefund().compareTo(replacement.getLineTotal()) != 0) {
                throw new AppException(ErrorCode.EXCHANGE_EVEN_AMOUNT_MISMATCH);
            }
        }
    }

    private ResolutionType parseResolution(String raw) {
        if (raw == null || raw.isBlank()) {
            return ResolutionType.REFUND;
        }
        try {
            return ResolutionType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_RESOLUTION_TYPE);
        }
    }

    private List<ResolvedReturnLine> resolveReturnLines(
            List<CreateExchangeOrderRequest.ReturnItemRequest> returnItems,
            SalesOrder originalOrder,
            Map<Integer, Integer> returnedByLine) {

        List<SalesOrderDetail> activeLines = originalOrder.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .toList();

        List<ResolvedReturnLine> resolved = new ArrayList<>();

        Map<Integer, Integer> claimedInThisRequest = new HashMap<>();

        for (CreateExchangeOrderRequest.ReturnItemRequest returnItem : returnItems) {
            SalesOrderDetail soldLine = matchLine(returnItem, activeLines);

            int alreadyReturned = returnedByLine.getOrDefault(soldLine.getId(), 0);
            int claimedSoFar = claimedInThisRequest.getOrDefault(soldLine.getId(), 0);
            int remaining = soldLine.getQuantity() - alreadyReturned - claimedSoFar;

            if (returnItem.getQuantity() > remaining) {
                throw new AppException(ErrorCode.RETURN_QUANTITY_EXCEEDS_REMAINING);
            }

            ItemCondition condition = parseCondition(returnItem.getItemCondition());
            assertProductIsReturnable(soldLine);

            claimedInThisRequest.put(soldLine.getId(), claimedSoFar + returnItem.getQuantity());
            resolved.add(new ResolvedReturnLine(
                    soldLine,
                    returnItem.getQuantity(),
                    parseResolution(returnItem.getResolutionType()),
                    condition,
                    trimToNull(returnItem.getItemNote()),
                    returnItem.getPairedExchangeItemRef()));
        }

        return resolved;
    }

    private Map<Integer, Integer> returnedQuantityByLine(Integer salesOrderId) {
        Map<Integer, Integer> returned = new HashMap<>();
        for (Object[] row : returnOrderDetailRepository.sumReturnedQuantityByOrder(salesOrderId)) {
            returned.put((Integer) row[0], ((Number) row[1]).intValue());
        }
        return returned;
    }

    private SalesOrderStatus deriveOrderStatus(SalesOrder order) {
        Map<Integer, Integer> returnedByLine = returnedQuantityByLine(order.getId());

        List<SalesOrderDetail> activeLines = order.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .toList();

        if (activeLines.isEmpty() || returnedByLine.isEmpty()) {
            return SalesOrderStatus.PARTIALLY_RETURNED;
        }

        boolean allFullyReturned = activeLines.stream()
                .allMatch(line -> returnedByLine.getOrDefault(line.getId(), 0) >= line.getQuantity());

        return allFullyReturned ? SalesOrderStatus.RETURNED : SalesOrderStatus.PARTIALLY_RETURNED;
    }

    /**
     * Hạn đổi trả hết vào cuối ngày thứ N sau ngày mua.
     */
    private boolean isReturnWindowExpired(SalesOrder order) {
        Instant deadline = returnDeadline(order);
        return deadline != null && Instant.now().isAfter(deadline);
    }

    /**
     * Thời điểm hết hạn đổi trả của một hóa đơn, null khi cửa hàng không đặt hạn hoặc đơn
     * chưa có ngày tạo.
     */
    private Instant returnDeadline(SalesOrder order) {
        Integer windowDays = storeConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new AppException(ErrorCode.STORE_CONFIG_MISSING))
                .getReturnWindowDays();

        if (windowDays == null || order.getCreatedAt() == null) {
            return null;
        }

        return order.getCreatedAt()
                .atZone(STORE_ZONE)
                .toLocalDate()
                .plusDays(windowDays)
                .atTime(LocalTime.MAX)
                .atZone(STORE_ZONE)
                .toInstant();
    }

    /**
     * Quá hạn là cấm hẳn, kể cả hàng hỏng hay hết hạn.
     */
    private void assertWithinReturnWindow(SalesOrder order) {
        if (isReturnWindowExpired(order)) {
            throw new AppException(ErrorCode.RETURN_WINDOW_EXPIRED);
        }
    }

    private SalesOrderDetail matchLine(
            CreateExchangeOrderRequest.ReturnItemRequest returnItem,
            List<SalesOrderDetail> activeLines) {

        if (returnItem.getSalesOrderDetailId() != null) {
            return activeLines.stream()
                    .filter(line -> line.getId().equals(returnItem.getSalesOrderDetailId()))
                    .findFirst()
                    .orElseThrow(() -> new AppException(ErrorCode.RETURN_LINE_NOT_IN_ORDER));
        }

        List<SalesOrderDetail> candidates = activeLines.stream()
                .filter(line -> line.getProduct().getId().equals(returnItem.getProductId()))
                .toList();

        if (candidates.isEmpty()) {
            throw new AppException(ErrorCode.RETURN_LINE_NOT_IN_ORDER);
        }
        if (candidates.size() > 1) {
            throw new AppException(ErrorCode.RETURN_LINE_AMBIGUOUS);
        }
        return candidates.get(0);
    }

    private void addStockBack(SalesOrderDetail soldLine, int quantity, ItemCondition condition,
                              Integer returnOrderId, Integer staffId) {

        StockBatch batch = soldLine.getStockBatch() != null
                ? soldLine.getStockBatch()
                : stockBatchRepository
                .findFirstAvailableBatchByProductId(soldLine.getProduct().getId())
                .orElseThrow(() -> new AppException(ErrorCode.NO_AVAILABLE_STOCK_BATCH));

        int currentStock = stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId());

        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setReferenceType("RETURN_ORDER");
        movement.setReferenceId(returnOrderId);
        movement.setCreatedBy(staffId);
        movement.setCreatedAt(Instant.now());

        if (condition.isSellable()) {
            BatchLocation location = batchLocationRepository
                    .findFirstByBatchId(batch.getId())
                    .orElse(null);

            movement.setMovementType("RETURN");
            movement.setBatchLocation(location);
            movement.setQuantityDelta(quantity);
            movement.setStockAfter(currentStock + quantity);

            if (location != null) {
                location.setQuantity(location.getQuantity() + quantity);
                location.setUpdatedAt(Instant.now());
                location.setUpdatedBy(staffId);
                batchLocationRepository.save(location);
            }
        } else {
            // Hàng không bán lại được (DAMAGED / EXPIRED / OPENED) đi thẳng vào khu chứa
            // hàng đổi trả để admin xử lý sau (trả NCC hoặc tiêu huỷ). 
            StorageLocation holdLocation = storageLocationRepository
                    .findReturnHoldLocation()
                    .orElseThrow(() -> new AppException(ErrorCode.RETURN_HOLD_LOCATION_NOT_FOUND));

            BatchLocation holdLine = batchLocationRepository
                    .findActiveByBatchIdAndLocationId(batch.getId(), holdLocation.getId())
                    .orElseGet(() -> {
                        BatchLocation created = new BatchLocation();
                        created.setBatch(batch);
                        created.setLocation(holdLocation);
                        created.setQuantity(0);
                        created.setCreatedBy(staffId);
                        created.setCreatedAt(Instant.now());
                        return created;
                    });

            holdLine.setQuantity((holdLine.getQuantity() == null ? 0 : holdLine.getQuantity()) + quantity);
            holdLine.setUpdatedAt(Instant.now());
            holdLine.setUpdatedBy(staffId);
            batchLocationRepository.save(holdLine);

            movement.setMovementType("RETURN_HOLD_IN");
            movement.setBatchLocation(holdLine);
            movement.setQuantityDelta(quantity);
            movement.setStockAfter(currentStock + quantity);
        }

        stockMovementRepository.save(movement);
    }

    private void assertProductIsReturnable(SalesOrderDetail soldLine) {
        Boolean returnable = soldLine.getProduct().getIsReturnable();
        if (returnable != null && !returnable) {
            throw new AppException(ErrorCode.PRODUCT_NOT_RETURNABLE);
        }
    }

    private ItemCondition parseCondition(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(ErrorCode.ITEM_CONDITION_REQUIRED);
        }
        try {
            return ItemCondition.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_ITEM_CONDITION);
        }
    }

    /**
     * Build exchange order response
     */
    private ExchangeOrderResponse buildExchangeOrderResponse(
            ReturnOrder returnOrder,
            SalesOrder originalOrder,
            List<ResolvedReturnLine> resolvedLines,
            List<SalesOrderDetail> exchangeDetails,
            BigDecimal returnSubtotal,
            BigDecimal returnDiscount,
            BigDecimal totalReturnAmount,
            BigDecimal exchangeSubtotal,
            BigDecimal exchangeDiscount,
            BigDecimal totalExchangeAmount,
            BigDecimal netAmount,
            String refundMethod,
            DebtSettlement settlement,
            SalesOrder exchangeOrder) {

        List<ExchangeOrderResponse.ReturnItemInfo> returnItems = resolvedLines.stream()
                .map(line -> {
                    SalesOrderDetail soldLine = line.soldLine();
                    Product product = soldLine.getProduct();
                    BigDecimal unitPrice = soldLine.getUnitPrice();
                    return ExchangeOrderResponse.ReturnItemInfo.builder()
                            .salesOrderDetailId(soldLine.getId())
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode()
                                    : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName(soldLine.getUnitName())
                            .quantity(line.quantity())
                            .unitPrice(unitPrice)
                            .lineTotal(unitPrice
                                    .multiply(BigDecimal.valueOf(line.quantity())))
                            .build();
                })
                .collect(Collectors.toList());

        List<ExchangeOrderResponse.ExchangeItemInfo> exchangeItems = exchangeDetails.stream()
                .map(detail -> {
                    Product product = detail.getProduct();
                    return ExchangeOrderResponse.ExchangeItemInfo.builder()
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode()
                                    : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName(detail.getUnitName())
                            .quantity(detail.getQuantity())
                            .unitPrice(detail.getUnitPrice())
                            .discountAmount(detail.getDiscountAmount())
                            .lineTotal(detail.getLineTotal())
                            .build();
                })
                .collect(Collectors.toList());

        return ExchangeOrderResponse.builder()
                .returnOrderId(returnOrder.getId())
                .returnCode(returnOrder.getReturnCode())
                .originalOrderId(originalOrder.getId())
                .originalOrderCode(originalOrder.getOrderCode())
                .exchangeOrderId(exchangeOrder != null ? exchangeOrder.getId() : null)
                .exchangeOrderCode(exchangeOrder != null ? exchangeOrder.getOrderCode() : null)
                .originalTotalAmount(originalOrder.getTotalAmount())
                .returnSubtotal(returnSubtotal)
                .returnDiscount(returnDiscount)
                .totalReturnAmount(totalReturnAmount)
                .exchangeSubtotal(exchangeSubtotal)
                .exchangeDiscount(exchangeDiscount)
                .totalExchangeAmount(totalExchangeAmount)
                .netAmount(netAmount)
                .refundMethod(refundMethod)
                .originalIsDebt(Boolean.TRUE.equals(originalOrder.getIsDebt()))
                .debtRemainingBefore(settlement.remainingBefore())
                .debtOffsetAmount(settlement.debtOffset())
                .exchangeCreditAmount(settlement.exchangeCredit())
                .cashRefundAmount(settlement.cashRefund())
                .cashCollectAmount(settlement.cashCollect())
                .newDebtOnExchange(settlement.newDebtOnExchange())
                .debtPaymentCollected(settlement.debtPaymentCollected())
                .debtRemainingAfter(settlement.remainingAfter())
                .returnNote(returnOrder.getReturnReason())
                .createdAt(returnOrder.getCreatedAt())
                .returnItems(returnItems)
                .exchangeItems(exchangeItems)
                .build();
    }
}
