package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.ImportOrderConstants;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderService {

    SupplierRepository supplierRepository;
    ImportOrderRepository importOrderRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportOrderList(
            String search, String orderStatusFilter, int page, int size) {

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeOrderStatus = normalizeOrderStatusFilter(orderStatusFilter);

        List<ImportOrder> orders = importOrderRepository.searchAll(safeSearch, safeOrderStatus);
        return toPagedResponse(orders, page, size, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportHistory(
            Integer supplierId, String search, String statusFilter, int page, int size) {

        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safePaymentStatus = (statusFilter == null || statusFilter.isBlank())
                ? "ALL"
                : statusFilter.toUpperCase();

        List<ImportOrder> orders = importOrderRepository.searchBySupplier(supplierId, safeSearch);
        return toPagedResponse(orders, page, size, safePaymentStatus);
    }

    @Transactional(readOnly = true)
    public ImportOrderDetailResponse getImportOrderDetail(Integer orderId) {
        ImportOrder order = importOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        BigDecimal paid = supplierPaymentRepository.sumPaidAmountByImportOrder(orderId);
        String status = resolvePaymentStatus(order.getTotalCost(), paid);

        List<ImportOrderItemResponse> items = order.getImportOrderDetails().stream()
                .sorted(Comparator.comparing(detail -> detail.getId(), Comparator.nullsLast(Comparator.naturalOrder())))
                .map(detail -> ImportOrderItemResponse.builder()
                        .productName(detail.getProduct() != null ? detail.getProduct().getName() : null)
                        .quantity(detail.getQuantity())
                        .costPerUnit(detail.getCostPerUnit())
                        .lineTotal(detail.getLineTotal())
                        .build())
                .toList();

        return ImportOrderDetailResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .createdByName(resolveCreatedByName(order.getCreatedBy()))
                .totalCost(order.getTotalCost())
                .status(status)
                .items(items)
                .build();
    }

    private PageResponse<ImportOrderListItemResponse> toPagedResponse(
            List<ImportOrder> orders, int page, int size, String paymentStatusFilter) {

        Map<Integer, BigDecimal> paidPerOrder = supplierPaymentRepository.sumPaidAmountGroupByImportOrder()
                .stream()
                .collect(Collectors.toMap(row -> (Integer) row[0], row -> (BigDecimal) row[1]));

        Map<Integer, String> nameByUserId = resolveCreatedByNames(orders);

        List<ImportOrderListItemResponse> allItems = orders.stream()
                .map(order -> toListItem(order, paidPerOrder, nameByUserId))
                .toList();

        List<ImportOrderListItemResponse> filtered = filterByPaymentStatus(allItems, paymentStatusFilter);

        int totalElements = filtered.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage = Math.min(Math.max(page, 0), totalPages - 1);
        int from = safePage * size;
        int to = Math.min(from + size, totalElements);
        List<ImportOrderListItemResponse> pageContent = totalElements == 0 ? List.of() : filtered.subList(from, to);

        return PageResponse.<ImportOrderListItemResponse>builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    private List<ImportOrderListItemResponse> filterByPaymentStatus(
            List<ImportOrderListItemResponse> items, String paymentStatusFilter) {
        if (paymentStatusFilter == null || paymentStatusFilter.isBlank() || "ALL".equals(paymentStatusFilter)) {
            return items;
        }
        return switch (paymentStatusFilter) {
            case ImportOrderConstants.PAYMENT_STATUS_DEBT -> items.stream()
                    .filter(item -> ImportOrderConstants.PAYMENT_STATUS_DEBT.equals(item.getStatus()))
                    .toList();
            case ImportOrderConstants.PAYMENT_STATUS_DONE -> items.stream()
                    .filter(item -> ImportOrderConstants.PAYMENT_STATUS_DONE.equals(item.getStatus()))
                    .toList();
            default -> items;
        };
    }

    private ImportOrderListItemResponse toListItem(
            ImportOrder order, Map<Integer, BigDecimal> paidPerOrder, Map<Integer, String> nameByUserId) {

        BigDecimal paid = paidPerOrder.getOrDefault(order.getId(), BigDecimal.ZERO);
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;

        Supplier supplier = order.getSupplier();
        String orderStatus = order.getOrderStatus();
        boolean isImported = ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(orderStatus);

        // Chỉ đơn đã nhập mới tính nợ; DRAFT / chưa gán status → 0đ
        BigDecimal remainingDebt = isImported
                ? totalCost.subtract(paid).max(BigDecimal.ZERO)
                : BigDecimal.ZERO;
        String paymentStatus = isImported
                ? resolvePaymentStatus(order.getTotalCost(), paid)
                : ImportOrderConstants.PAYMENT_STATUS_DONE;

        return ImportOrderListItemResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .receivedAt(order.getCreatedAt())
                .createdByName(nameByUserId.get(order.getCreatedBy()))
                .totalCost(order.getTotalCost())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierCode(supplier != null ? supplier.getSupplierCode() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .orderStatus(orderStatus)
                .status(paymentStatus)
                .paidAmount(isImported ? paid : BigDecimal.ZERO)
                .remainingDebt(remainingDebt)
                .build();
    }

    private String normalizeOrderStatusFilter(String orderStatusFilter) {
        if (orderStatusFilter == null || orderStatusFilter.isBlank()) {
            return "ALL";
        }
        String normalized = orderStatusFilter.trim().toUpperCase();
        if ("ALL".equals(normalized)
                || ImportOrderConstants.ORDER_STATUS_DRAFT.equals(normalized)
                || ImportOrderConstants.ORDER_STATUS_IMPORTED.equals(normalized)) {
            return normalized;
        }
        return "ALL";
    }

    private String resolvePaymentStatus(BigDecimal totalCost, BigDecimal paid) {
        BigDecimal safeTotalCost = totalCost != null ? totalCost : BigDecimal.ZERO;
        BigDecimal safePaid = paid != null ? paid : BigDecimal.ZERO;
        return safeTotalCost.subtract(safePaid).compareTo(BigDecimal.ZERO) > 0
                ? ImportOrderConstants.PAYMENT_STATUS_DEBT
                : ImportOrderConstants.PAYMENT_STATUS_DONE;
    }

    private Map<Integer, String> resolveCreatedByNames(List<ImportOrder> orders) {
        List<Integer> userIds = orders.stream()
                .map(ImportOrder::getCreatedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (userIds.isEmpty()) {
            return Map.of();
        }

        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private String resolveCreatedByName(Integer userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }
}
