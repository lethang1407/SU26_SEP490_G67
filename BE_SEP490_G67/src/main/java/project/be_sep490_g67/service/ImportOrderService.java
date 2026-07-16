package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.ImportOrderDetail;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StorageLocationRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
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
    ImportOrderDetailRepository importOrderDetailRepository;
    StockBatchRepository stockBatchRepository;
    BatchLocationRepository batchLocationRepository;
    StorageLocationRepository storageLocationRepository;
    ProductRepository productRepository;
    ProductUnitRepository productUnitRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportOrders(
            String search, String statusFilter, int page, int size) {

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeStatus = (statusFilter == null || statusFilter.isBlank()) ? "ALL" : statusFilter.toUpperCase();

        List<ImportOrder> orders = importOrderRepository.searchAll(safeSearch);
        return buildPagedList(orders, safeStatus, page, size);
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportOrderListItemResponse> getImportHistory(
            Integer supplierId, String search, String statusFilter, int page, int size) {

        if (!supplierRepository.existsByIdAndIsRemovedFalse(supplierId)) {
            throw new AppException(ErrorCode.NOT_FOUND_SUPPLIER);
        }

        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeStatus = (statusFilter == null || statusFilter.isBlank()) ? "ALL" : statusFilter.toUpperCase();

        List<ImportOrder> orders = importOrderRepository.searchBySupplier(supplierId, safeSearch);
        return buildPagedList(orders, safeStatus, page, size);
    }

    @Transactional(readOnly = true)
    public ImportOrderDetailResponse getImportOrderDetail(Integer orderId) {
        ImportOrder order = importOrderRepository.findDetailById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER));

        ImportOrder orderWithBatches = importOrderRepository.findWithBatchesById(orderId).orElse(order);

        BigDecimal paid = defaultZero(supplierPaymentRepository.sumPaidAmountByImportOrder(orderId));
        BigDecimal totalCost = defaultZero(order.getTotalCost());
        String status = resolveStatus(totalCost, paid);

        List<StockBatch> batches = orderWithBatches.getStockBatches().stream()
                .filter(batch -> !Boolean.TRUE.equals(batch.getIsRemoved()))
                .sorted(Comparator.comparing(StockBatch::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<ImportOrderDetail> details = order.getImportOrderDetails().stream()
                .filter(detail -> !Boolean.TRUE.equals(detail.getIsRemoved()))
                .sorted(Comparator.comparing(ImportOrderDetail::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<ImportOrderItemResponse> items = new ArrayList<>();
        for (int i = 0; i < details.size(); i++) {
            ImportOrderDetail detail = details.get(i);
            StockBatch batch = i < batches.size() ? batches.get(i) : findMatchingBatch(batches, detail);
            items.add(toItemResponse(detail, batch));
        }

        Supplier supplier = order.getSupplier();

        return ImportOrderDetailResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .createdByName(resolveCreatedByName(order.getCreatedBy()))
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .note(order.getNote())
                .totalCost(totalCost)
                .status(status)
                .paidAmount(paid)
                .remainingDebt(totalCost.subtract(paid).max(BigDecimal.ZERO))
                .items(items)
                .build();
    }

    /**
     * Tạo phiếu nhập hàng: mỗi dòng → 1 ImportOrderDetail + 1 StockBatch.
     * Nếu có locationId → tạo luôn BatchLocation (xếp kệ ngay).
     */
    @Transactional
    public ImportOrderDetailResponse createImportOrder(CreateImportOrderRequest request, Integer createdBy) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new AppException(ErrorCode.IMPORT_ITEMS_EMPTY);
        }

        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(request.getSupplierId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

        LocalDate receivedDate = request.getReceivedDate() != null ? request.getReceivedDate() : LocalDate.now();

        ImportOrder order = new ImportOrder();
        order.setSupplier(supplier);
        order.setOrderCode(generateOrderCode(receivedDate));
        order.setReceivedDate(receivedDate);
        order.setNote(trimToNull(request.getNote()));
        order.setTotalCost(BigDecimal.ZERO);
        order.setIsRemoved(false);

        ImportOrder savedOrder = importOrderRepository.save(order);

        BigDecimal totalCost = BigDecimal.ZERO;
        List<ImportOrderItemResponse> items = new ArrayList<>();

        for (CreateImportOrderRequest.ImportOrderItemRequest item : request.getItems()) {
            if (item.getQuantity() == null || item.getQuantity() < 1) {
                throw new AppException(ErrorCode.INVALID_IMPORT_QUANTITY);
            }
            if (item.getCostPerUnit() == null || item.getCostPerUnit().compareTo(BigDecimal.ZERO) < 0) {
                throw new AppException(ErrorCode.INVALID_IMPORT_COST);
            }

            Product product = productRepository.findActiveById(item.getProductId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

            BigDecimal lineTotal = item.getCostPerUnit().multiply(BigDecimal.valueOf(item.getQuantity()));

            ImportOrderDetail detail = new ImportOrderDetail();
            detail.setImportOrder(savedOrder);
            detail.setProduct(product);
            detail.setQuantity(item.getQuantity());
            detail.setCostPerUnit(item.getCostPerUnit());
            detail.setLineTotal(lineTotal);
            detail.setExpiryDate(item.getExpiryDate());
            detail.setIsRemoved(false);
            importOrderDetailRepository.save(detail);

            StockBatch batch = new StockBatch();
            batch.setProduct(product);
            batch.setImportOrder(savedOrder);
            batch.setCostPerUnit(item.getCostPerUnit());
            batch.setQuantityIn(item.getQuantity());
            batch.setReceivedDate(receivedDate);
            batch.setExpiryDate(item.getExpiryDate());
            batch.setIsRemoved(false);
            StockBatch savedBatch = stockBatchRepository.save(batch);

            Integer locationId = null;
            String locationLabel = null;
            if (item.getLocationId() != null) {
                StorageLocation location = placeBatchOnLocation(
                        savedBatch, item.getLocationId(), item.getQuantity());
                locationId = location.getId();
                locationLabel = location.getLabel();
            }

            product.setCostPrice(item.getCostPerUnit());
            productRepository.save(product);

            totalCost = totalCost.add(lineTotal);

            items.add(ImportOrderItemResponse.builder()
                    .productId(product.getId())
                    .productCode(resolveProductCode(product))
                    .productName(product.getName())
                    .unit(resolveBaseUnitName(product.getId()))
                    .quantity(item.getQuantity())
                    .costPerUnit(item.getCostPerUnit())
                    .lineTotal(lineTotal)
                    .expiryDate(item.getExpiryDate() != null ? item.getExpiryDate().toString() : null)
                    .batchId(savedBatch.getId())
                    .batchCode("BATCH-" + savedBatch.getId())
                    .locationId(locationId)
                    .locationLabel(locationLabel)
                    .build());
        }

        savedOrder.setTotalCost(totalCost);
        importOrderRepository.save(savedOrder);

        return ImportOrderDetailResponse.builder()
                .id(savedOrder.getId())
                .orderCode(savedOrder.getOrderCode())
                .receivedDate(savedOrder.getReceivedDate())
                .createdByName(resolveCreatedByName(createdBy))
                .supplierId(supplier.getId())
                .supplierName(supplier.getName())
                .note(savedOrder.getNote())
                .totalCost(totalCost)
                .status(STATUS_DEBT)
                .paidAmount(BigDecimal.ZERO)
                .remainingDebt(totalCost)
                .items(items)
                .build();
    }

    private StorageLocation placeBatchOnLocation(StockBatch batch, Integer locationId, int quantity) {
        StorageLocation location = storageLocationRepository.findActiveWithContentsById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        Integer occupiedProductId = location.getBatchLocations().stream()
                .filter(bl -> !Boolean.TRUE.equals(bl.getIsRemoved()))
                .filter(bl -> bl.getQuantity() != null && bl.getQuantity() > 0)
                .map(bl -> bl.getBatch().getProduct().getId())
                .findFirst()
                .orElse(null);

        if (occupiedProductId != null && !Objects.equals(occupiedProductId, batch.getProduct().getId())) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_PRODUCT_MISMATCH);
        }

        BatchLocation existing = batchLocationRepository
                .findActiveByBatchIdAndLocationId(batch.getId(), location.getId())
                .orElse(null);

        if (existing != null) {
            int current = existing.getQuantity() != null ? existing.getQuantity() : 0;
            existing.setQuantity(current + quantity);
            batchLocationRepository.save(existing);
            return location;
        }

        BatchLocation created = new BatchLocation();
        created.setBatch(batch);
        created.setLocation(location);
        created.setQuantity(quantity);
        created.setIsRemoved(false);
        batchLocationRepository.save(created);
        return location;
    }

    private PageResponse<ImportOrderListItemResponse> buildPagedList(
            List<ImportOrder> orders, String safeStatus, int page, int size) {

        Map<Integer, BigDecimal> paidPerOrder = supplierPaymentRepository.sumPaidAmountGroupByImportOrder()
                .stream()
                .collect(Collectors.toMap(row -> (Integer) row[0], row -> (BigDecimal) row[1]));

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
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / Math.max(size, 1)));
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

    private ImportOrderListItemResponse toListItem(
            ImportOrder order, Map<Integer, BigDecimal> paidPerOrder, Map<Integer, String> nameByUserId) {

        BigDecimal paid = paidPerOrder.getOrDefault(order.getId(), BigDecimal.ZERO);
        BigDecimal totalCost = defaultZero(order.getTotalCost());
        BigDecimal remainingDebt = totalCost.subtract(paid).max(BigDecimal.ZERO);

        List<ImportOrderDetail> activeDetails = order.getImportOrderDetails() == null
                ? List.of()
                : order.getImportOrderDetails().stream()
                        .filter(detail -> !Boolean.TRUE.equals(detail.getIsRemoved()))
                        .toList();

        int itemCount = activeDetails.size();
        int totalQuantity = activeDetails.stream()
                .mapToInt(detail -> detail.getQuantity() != null ? detail.getQuantity() : 0)
                .sum();

        Supplier supplier = order.getSupplier();

        return ImportOrderListItemResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .receivedDate(order.getReceivedDate())
                .createdByName(nameByUserId.get(order.getCreatedBy()))
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .note(order.getNote())
                .itemCount(itemCount)
                .totalQuantity(totalQuantity)
                .totalCost(order.getTotalCost())
                .status(resolveStatus(order.getTotalCost(), paid))
                .paidAmount(paid)
                .remainingDebt(remainingDebt)
                .build();
    }

    private ImportOrderItemResponse toItemResponse(ImportOrderDetail detail, StockBatch batch) {
        Product product = detail.getProduct();
        BatchLocation location = null;
        if (batch != null && batch.getBatchLocations() != null) {
            location = batch.getBatchLocations().stream()
                    .filter(bl -> !Boolean.TRUE.equals(bl.getIsRemoved()))
                    .filter(bl -> bl.getQuantity() != null && bl.getQuantity() > 0)
                    .findFirst()
                    .orElse(null);
        }

        return ImportOrderItemResponse.builder()
                .productId(product != null ? product.getId() : null)
                .productCode(product != null ? resolveProductCode(product) : null)
                .productName(product != null ? product.getName() : null)
                .unit(product != null ? resolveBaseUnitName(product.getId()) : null)
                .quantity(detail.getQuantity())
                .costPerUnit(detail.getCostPerUnit())
                .lineTotal(detail.getLineTotal())
                .expiryDate(detail.getExpiryDate() != null ? detail.getExpiryDate().toString() : null)
                .batchId(batch != null ? batch.getId() : null)
                .batchCode(batch != null ? "BATCH-" + batch.getId() : null)
                .locationId(location != null && location.getLocation() != null
                        ? location.getLocation().getId()
                        : null)
                .locationLabel(location != null && location.getLocation() != null
                        ? location.getLocation().getLabel()
                        : null)
                .build();
    }

    private StockBatch findMatchingBatch(List<StockBatch> batches, ImportOrderDetail detail) {
        return batches.stream()
                .filter(batch -> Objects.equals(
                        batch.getProduct() != null ? batch.getProduct().getId() : null,
                        detail.getProduct() != null ? detail.getProduct().getId() : null))
                .filter(batch -> Objects.equals(batch.getExpiryDate(), detail.getExpiryDate()))
                .filter(batch -> Objects.equals(batch.getQuantityIn(), detail.getQuantity()))
                .findFirst()
                .orElse(null);
    }

    private String generateOrderCode(LocalDate receivedDate) {
        String datePart = receivedDate.format(DateTimeFormatter.BASIC_ISO_DATE);
        int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "PO-" + datePart + "-" + suffix;
    }

    private String resolveStatus(BigDecimal totalCost, BigDecimal paid) {
        BigDecimal safeTotalCost = defaultZero(totalCost);
        BigDecimal safePaid = defaultZero(paid);
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

    private String resolveProductCode(Product product) {
        if (product.getBarcode() != null && !product.getBarcode().isBlank()) {
            return product.getBarcode().trim();
        }
        return String.format("SP%05d", product.getId());
    }

    private String resolveBaseUnitName(Integer productId) {
        return productUnitRepository.findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(productId).stream()
                .findFirst()
                .map(ProductUnit::getName)
                .orElse("Cái");
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
