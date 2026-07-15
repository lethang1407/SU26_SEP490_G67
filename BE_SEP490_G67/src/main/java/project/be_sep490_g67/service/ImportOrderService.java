package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.ImportOrder;
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

    private static final String STATUS_DEBT = "DEBT";
    private static final String STATUS_DONE = "DONE";

    SupplierRepository supplierRepository;
    ImportOrderRepository importOrderRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportHistory(
            Integer supplierId, String search, String statusFilter, int page, int size) {

        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeStatus = (statusFilter == null || statusFilter.isBlank()) ? "ALL" : statusFilter.toUpperCase();

        List<ImportOrder> orders = importOrderRepository.searchBySupplier(supplierId, safeSearch);

        // Nợ từng đơn = totalCost - tổng đã trả (derive, không cache) — 1 query gộp tránh N+1
        Map<Integer, BigDecimal> paidPerOrder = supplierPaymentRepository.sumPaidAmountGroupByImportOrder()
                .stream()
                .collect(Collectors.toMap(row -> (Integer) row[0], row -> (BigDecimal) row[1]));

        // "Người tạo" — gộp 1 lần theo batch id user, tránh N+1 khi có nhiều đơn
        Map<Integer, String> nameByUserId = resolveCreatedByNames(orders);

        List<ImportOrderListItemResponse> allItems = orders.stream()
                .map(order -> toListItem(order, paidPerOrder, nameByUserId))
                .toList();

        List<ImportOrderListItemResponse> filtered = switch (safeStatus) {
            case STATUS_DEBT -> allItems.stream().filter(item -> STATUS_DEBT.equals(item.getStatus())).toList();
            case STATUS_DONE -> allItems.stream().filter(item -> STATUS_DONE.equals(item.getStatus())).toList();
            default -> allItems;
        };

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

    @Transactional(readOnly = true)
    public ImportOrderDetailResponse getImportOrderDetail(Integer orderId) {
        ImportOrder order = importOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        BigDecimal paid = supplierPaymentRepository.sumPaidAmountByImportOrder(orderId);
        String status = resolveStatus(order.getTotalCost(), paid);

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

    private ImportOrderListItemResponse toListItem(
            ImportOrder order, Map<Integer, BigDecimal> paidPerOrder, Map<Integer, String> nameByUserId) {

        BigDecimal paid = paidPerOrder.getOrDefault(order.getId(), BigDecimal.ZERO);
        BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
        BigDecimal remainingDebt = totalCost.subtract(paid).max(BigDecimal.ZERO);

        return ImportOrderListItemResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .createdByName(nameByUserId.get(order.getCreatedBy()))
                .totalCost(order.getTotalCost())
                .status(resolveStatus(order.getTotalCost(), paid))
                .paidAmount(paid)
                .remainingDebt(remainingDebt)
                .build();
    }

    private String resolveStatus(BigDecimal totalCost, BigDecimal paid) {
        BigDecimal safeTotalCost = totalCost != null ? totalCost : BigDecimal.ZERO;
        BigDecimal safePaid = paid != null ? paid : BigDecimal.ZERO;
        return safeTotalCost.subtract(safePaid).compareTo(BigDecimal.ZERO) > 0 ? STATUS_DEBT : STATUS_DONE;
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
