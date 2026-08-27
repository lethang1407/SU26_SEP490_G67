package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.BatchCreateSupplierPaymentRequest;
import project.be_sep490_g67.dto.request.CreateSupplierPaymentRequest;
import project.be_sep490_g67.dto.response.BatchSupplierPaymentResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.SupplierPaymentResponse;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.SupplierPayment;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.constants.ImportOrderConstants;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierPaymentService {

    SupplierRepository supplierRepository;
    ImportOrderRepository importOrderRepository;
    SupplierPaymentRepository supplierPaymentRepository;

    @Transactional
    public SupplierPaymentResponse createPayment(Integer supplierId, CreateSupplierPaymentRequest request) {
        if (request.getOrderId() == null) {
            throw new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER);
        }
        BatchSupplierPaymentResponse batch = createBatchPayment(supplierId, BatchCreateSupplierPaymentRequest.builder()
                .importOrderIds(List.of(request.getOrderId()))
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .note(request.getNote())
                .build());
        return batch.getPaymentDetails().get(0);
    }

    @Transactional
    public BatchSupplierPaymentResponse createBatchPayment(
            Integer supplierId, BatchCreateSupplierPaymentRequest request) {
        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

        if (request.getImportOrderIds() == null || request.getImportOrderIds().isEmpty()) {
            throw new AppException(ErrorCode.SUPPLIER_PAYMENT_ORDER_LIST_REQUIRED);
        }

        List<Integer> distinctOrderIds = new ArrayList<>(new LinkedHashSet<>(
                request.getImportOrderIds().stream().filter(Objects::nonNull).toList()
        ));
        if (distinctOrderIds.isEmpty()) {
            throw new AppException(ErrorCode.SUPPLIER_PAYMENT_ORDER_LIST_REQUIRED);
        }

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        List<ImportOrder> loaded = importOrderRepository.findAllById(distinctOrderIds);
        Map<Integer, ImportOrder> byId = new HashMap<>();
        for (ImportOrder order : loaded) {
            byId.put(order.getId(), order);
        }

        List<ImportOrder> debtOrders = new ArrayList<>();
        for (Integer orderId : distinctOrderIds) {
            ImportOrder order = byId.get(orderId);
            if (order == null
                    || Boolean.TRUE.equals(order.getIsRemoved())
                    || order.getSupplier() == null
                    || !supplierId.equals(order.getSupplier().getId())
                    || !ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(order.getOrderStatus())) {
                throw new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER);
            }
            debtOrders.add(order);
        }

        debtOrders.sort(Comparator
                .comparing(ImportOrder::getReceivedDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ImportOrder::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ImportOrder::getId));

        BigDecimal totalRemaining = debtOrders.stream()
                .map(this::remainingDebtOf)
                .filter(remaining -> remaining.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalRemaining.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED);
        }
        if (amount.compareTo(totalRemaining) > 0) {
            throw new AppException(ErrorCode.PAYMENT_EXCEEDS_DEBT);
        }

        String method = request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()
                ? "CASH" : request.getPaymentMethod();
        LocalDateTime paidAt = LocalDateTime.now();
        int nextSeq = nextPaymentSequence();
        BigDecimal unapplied = amount;
        List<SupplierPaymentResponse> paymentDetails = new ArrayList<>();

        for (ImportOrder order : debtOrders) {
            if (unapplied.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal remaining = remainingDebtOf(order);
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal paidForOrder = unapplied.min(remaining);

            SupplierPayment payment = new SupplierPayment();
            payment.setPaymentCode(formatPaymentCode(nextSeq++));
            payment.setSupplier(supplier);
            payment.setImportOrder(order);
            payment.setAmount(paidForOrder);
            payment.setPaymentMethod(method);
            payment.setPaymentDate(paidAt);
            payment.setNote(request.getNote());
            payment.setIsRemoved(false);

            SupplierPayment saved = supplierPaymentRepository.save(payment);
            paymentDetails.add(SupplierPaymentResponse.builder()
                    .id(saved.getId())
                    .paymentCode(saved.getPaymentCode())
                    .orderId(order.getId())
                    .orderCode(order.getOrderCode())
                    .amount(saved.getAmount())
                    .paymentMethod(saved.getPaymentMethod())
                    .paymentDate(saved.getPaymentDate())
                    .note(saved.getNote())
                    .remainingDebtAfter(remaining.subtract(paidForOrder).max(BigDecimal.ZERO))
                    .build());
            unapplied = unapplied.subtract(paidForOrder);

            log.info("Recorded payment {} for order {} (supplier {}), amount={}",
                    saved.getPaymentCode(), order.getOrderCode(), supplierId, paidForOrder);
        }

        return BatchSupplierPaymentResponse.builder()
                .supplierId(supplier.getId())
                .supplierName(supplier.getName())
                .totalPaidAmount(amount)
                .paymentDetails(paymentDetails)
                .build();
    }

    private BigDecimal remainingDebtOf(ImportOrder order) {
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal paidSoFar = supplierPaymentRepository.sumPaidAmountByImportOrder(order.getId());
        if (paidSoFar == null) {
            paidSoFar = BigDecimal.ZERO;
        }
        return totalCost.subtract(paidSoFar).max(BigDecimal.ZERO);
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierPaymentResponse> getPaymentHistory(
            Integer supplierId, String search, LocalDate fromDate, LocalDate toDate, int page, int size) {

        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }

        List<SupplierPayment> payments = supplierPaymentRepository.findAllBySupplierOrderByPaymentDateAsc(supplierId);

        // Derive "nợ còn lại sau lần trả này" — cộng dồn các lần trả của CÙNG 1 đơn theo
        // đúng thứ tự thời gian xảy ra (list đã ORDER BY paymentDate ASC), rồi trừ ngược
        // từ totalCost. Không cache field này ở DB, khớp nguyên tắc derive-only đã chốt.
        Map<Integer, BigDecimal> paidSoFarByOrder = new HashMap<>();
        List<SupplierPaymentResponse> allItems = payments.stream()
                .map(payment -> toResponse(payment, paidSoFarByOrder))
                .toList();

        String normalizedSearch = (search == null) ? "" : search.trim().toLowerCase();

        List<SupplierPaymentResponse> filtered = allItems.stream()
                .filter(item -> normalizedSearch.isEmpty()
                        || (item.getPaymentCode() != null && item.getPaymentCode().toLowerCase().contains(normalizedSearch))
                        || (item.getOrderCode() != null && item.getOrderCode().toLowerCase().contains(normalizedSearch)))
                .filter(item -> fromDate == null || !item.getPaymentDate().toLocalDate().isBefore(fromDate))
                .filter(item -> toDate == null || !item.getPaymentDate().toLocalDate().isAfter(toDate))
                .sorted(Comparator.comparing(SupplierPaymentResponse::getPaymentDate).reversed())
                .toList();

        int totalElements = filtered.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage = Math.min(Math.max(page, 0), totalPages - 1);
        int from = safePage * size;
        int to = Math.min(from + size, totalElements);
        List<SupplierPaymentResponse> pageContent = totalElements == 0 ? List.of() : filtered.subList(from, to);

        return PageResponse.<SupplierPaymentResponse>builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierPaymentResponse> getPaymentHistoryByImportOrder(
            Integer importOrderId, int page, int size) {

        ImportOrder order = importOrderRepository.findById(importOrderId)
                .filter(io -> !Boolean.TRUE.equals(io.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        List<SupplierPayment> payments =
                supplierPaymentRepository.findAllByImportOrderOrderByPaymentDateAsc(order.getId());

        Map<Integer, BigDecimal> paidSoFarByOrder = new HashMap<>();
        List<SupplierPaymentResponse> allItems = payments.stream()
                .map(payment -> toResponse(payment, paidSoFarByOrder))
                .sorted(Comparator.comparing(SupplierPaymentResponse::getPaymentDate).reversed())
                .toList();

        int totalElements = allItems.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage = Math.min(Math.max(page, 0), totalPages - 1);
        int from = safePage * size;
        int to = Math.min(from + size, totalElements);
        List<SupplierPaymentResponse> pageContent = totalElements == 0 ? List.of() : allItems.subList(from, to);

        return PageResponse.<SupplierPaymentResponse>builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    private SupplierPaymentResponse toResponse(SupplierPayment payment, Map<Integer, BigDecimal> paidSoFarByOrder) {
        ImportOrder order = payment.getImportOrder();

        BigDecimal remainingAfter = null;
        Integer orderId = null;
        String orderCode = null;

        if (order != null) {
            orderId = order.getId();
            orderCode = order.getOrderCode();
            BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
            BigDecimal paidSoFar = paidSoFarByOrder.merge(orderId, payment.getAmount(), BigDecimal::add);
            remainingAfter = totalCost.subtract(paidSoFar).max(BigDecimal.ZERO);
        }

        return SupplierPaymentResponse.builder()
                .id(payment.getId())
                .paymentCode(payment.getPaymentCode())
                .orderId(orderId)
                .orderCode(orderCode)
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .paymentDate(payment.getPaymentDate())
                .note(payment.getNote())
                .remainingDebtAfter(remainingAfter)
                .build();
    }

    private int nextPaymentSequence() {
        String prefix = ImportOrderConstants.PAYMENT_CODE_PREFIX;
        int nextSeq = supplierPaymentRepository.findLatestTtnPaymentCode()
                .map(code -> Integer.parseInt(code.substring(prefix.length())) + 1)
                .orElse(0);
        if (nextSeq > 999_999) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        return nextSeq;
    }

    private String formatPaymentCode(int seq) {
        return ImportOrderConstants.PAYMENT_CODE_PREFIX
                + String.format("%0" + ImportOrderConstants.PAYMENT_CODE_SEQ_LENGTH + "d", seq);
    }
}
