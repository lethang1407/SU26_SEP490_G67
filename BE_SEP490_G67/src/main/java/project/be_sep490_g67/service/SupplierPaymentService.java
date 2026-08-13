package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateSupplierPaymentRequest;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(supplierId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

        ImportOrder order = importOrderRepository.findById(request.getOrderId())
                .filter(io -> !Boolean.TRUE.equals(io.getIsRemoved()))
                .filter(io -> io.getSupplier() != null && io.getSupplier().getId().equals(supplierId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal paidSoFar = supplierPaymentRepository.sumPaidAmountByImportOrder(order.getId());
        BigDecimal remainingDebt = totalCost.subtract(paidSoFar).max(BigDecimal.ZERO);

        if (amount.compareTo(remainingDebt) > 0) {
            throw new AppException(ErrorCode.PAYMENT_EXCEEDS_DEBT);
        }

        SupplierPayment payment = new SupplierPayment();
        payment.setPaymentCode(generatePaymentCode());
        payment.setSupplier(supplier);
        payment.setImportOrder(order);
        payment.setAmount(amount);
        payment.setPaymentMethod(request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()
                ? "CASH" : request.getPaymentMethod());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNote(request.getNote());
        payment.setIsRemoved(false);

        SupplierPayment saved = supplierPaymentRepository.save(payment);
        log.info("Recorded payment {} for order {} (supplier {}), amount={}",
                saved.getPaymentCode(), order.getOrderCode(), supplierId, amount);

        BigDecimal remainingAfter = remainingDebt.subtract(amount).max(BigDecimal.ZERO);

        return SupplierPaymentResponse.builder()
                .id(saved.getId())
                .paymentCode(saved.getPaymentCode())
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .amount(saved.getAmount())
                .paymentMethod(saved.getPaymentMethod())
                .paymentDate(saved.getPaymentDate())
                .note(saved.getNote())
                .remainingDebtAfter(remainingAfter)
                .build();
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

    private String generatePaymentCode() {
        String prefix = ImportOrderConstants.PAYMENT_CODE_PREFIX;
        int seqLength = ImportOrderConstants.PAYMENT_CODE_SEQ_LENGTH;

        int nextSeq = supplierPaymentRepository.findLatestTtnPaymentCode()
                .map(code -> Integer.parseInt(code.substring(prefix.length())) + 1)
                .orElse(0);

        if (nextSeq > 999_999) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        return prefix + String.format("%0" + seqLength + "d", nextSeq);
    }
}
