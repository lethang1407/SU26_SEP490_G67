package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateInventoryCheckRequest;
import project.be_sep490_g67.dto.response.InventoryCheckAttentionItemResponse;
import project.be_sep490_g67.dto.response.InventoryCheckDetailResponse;
import project.be_sep490_g67.dto.response.InventoryCheckLineResponse;
import project.be_sep490_g67.dto.response.InventoryCheckListItemResponse;
import project.be_sep490_g67.dto.response.InventoryCheckProductPreviewResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.InventoryCheck;
import project.be_sep490_g67.entity.InventoryCheckDetail;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.InventoryCheckDetailRepository;
import project.be_sep490_g67.repository.InventoryCheckRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InventoryCheckService {

    public static final String STATUS_IN_PROGRESS = "in_progress";
    public static final String STATUS_COMPLETED = "completed";
    public static final String STATUS_CANCELLED = "cancelled";

    private static final String DEFAULT_WAREHOUSE = "Kho chính - CH01";
    private static final String MOVEMENT_TYPE = "INVENTORY_CHECK";
    private static final String REFERENCE_TYPE = "INVENTORY_CHECK";

    InventoryCheckRepository inventoryCheckRepository;
    InventoryCheckDetailRepository inventoryCheckDetailRepository;
    ProductRepository productRepository;
    BatchLocationRepository batchLocationRepository;
    StockBatchRepository stockBatchRepository;
    StockMovementRepository stockMovementRepository;
    ProductUnitRepository productUnitRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<InventoryCheckListItemResponse> getChecks(
            String search, String status, int page, int size) {

        String safeSearch = search == null ? "" : search.trim();
        String safeStatus = status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                ? "all"
                : status.trim().toLowerCase();

        List<InventoryCheck> checks = inventoryCheckRepository.search(safeSearch, safeStatus);
        Map<Integer, String> names = resolveCreatedByNames(checks);

        List<InventoryCheckListItemResponse> allItems = checks.stream()
                .map(check -> toListItem(check, names))
                .toList();

        return paginate(allItems, page, size);
    }

    @Transactional(readOnly = true)
    public InventoryCheckDetailResponse getCheckDetail(Integer id) {
        InventoryCheck check = inventoryCheckRepository.findDetailById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVENTORY_CHECK_NOT_FOUND));
        return toDetailResponse(check);
    }

    @Transactional(readOnly = true)
    public InventoryCheckProductPreviewResponse getProductPreview(Integer productId) {
        Product product = productRepository.findById(productId)
                .filter(p -> !Boolean.TRUE.equals(p.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
        return toProductPreview(product);
    }

    @Transactional(readOnly = true)
    public List<InventoryCheckAttentionItemResponse> getAttentionItems() {
        LocalDate today = LocalDate.now();
        LocalDate until = today.plusDays(30);

        List<InventoryCheckAttentionItemResponse> items = new ArrayList<>();

        for (StockBatch batch : stockBatchRepository.findExpiredWithStock()) {
            items.add(toAttentionItem(batch, "EXPIRED", "Đã hết hạn"));
        }
        for (StockBatch batch : stockBatchRepository.findExpiringSoonWithStock(until)) {
            items.add(toAttentionItem(batch, "EXPIRING_SOON", "Sắp hết hạn"));
        }

        return items;
    }

    /**
     * Tạo phiếu kiểm kho theo sản phẩm/lô và hoàn tất ngay: điều chỉnh tồn.
     */
    @Transactional
    public InventoryCheckDetailResponse createCheck(CreateInventoryCheckRequest request, Integer createdBy) {
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new AppException(ErrorCode.INVENTORY_CHECK_ITEMS_EMPTY);
        }

        Set<String> seenKeys = new HashSet<>();
        Set<Integer> allScopeProducts = new HashSet<>();
        Set<Integer> batchScopeProducts = new HashSet<>();

        for (CreateInventoryCheckRequest.InventoryCheckLineRequest line : request.getLines()) {
            if (line.getActualQty() == null || line.getActualQty() < 0) {
                throw new AppException(ErrorCode.INVALID_INVENTORY_CHECK_QTY);
            }
            String key = lineKey(line.getProductId(), line.getStockBatchId());
            if (!seenKeys.add(key)) {
                throw new AppException(ErrorCode.INVENTORY_CHECK_DUPLICATE_LINE);
            }
            if (line.getStockBatchId() == null) {
                allScopeProducts.add(line.getProductId());
            } else {
                batchScopeProducts.add(line.getProductId());
            }
        }

        for (Integer productId : allScopeProducts) {
            if (batchScopeProducts.contains(productId)) {
                throw new AppException(ErrorCode.INVENTORY_CHECK_BATCH_CONFLICT);
            }
        }

        Instant now = Instant.now();
        Instant checkAt = request.getCheckDate() != null
                ? request.getCheckDate().atStartOfDay(ZoneId.systemDefault()).toInstant()
                : now;
        InventoryCheck check = new InventoryCheck();
        check.setCheckCode(generateCheckCode(now));
        check.setCheckDate(checkAt);
        check.setStatus(STATUS_COMPLETED);
        check.setWarehouse(
                request.getWarehouse() == null || request.getWarehouse().isBlank()
                        ? DEFAULT_WAREHOUSE
                        : request.getWarehouse().trim());
        check.setNote(trimToNull(request.getNote()));
        check.setIsRemoved(false);

        InventoryCheck savedCheck = inventoryCheckRepository.save(check);

        for (CreateInventoryCheckRequest.InventoryCheckLineRequest lineReq : request.getLines()) {
            Product product = productRepository.findById(lineReq.getProductId())
                    .filter(p -> !Boolean.TRUE.equals(p.getIsRemoved()))
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

            StockBatch targetBatch = null;
            int systemQty;
            if (lineReq.getStockBatchId() != null) {
                targetBatch = stockBatchRepository.findActiveWithProductById(lineReq.getStockBatchId())
                        .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));
                if (!Objects.equals(targetBatch.getProduct().getId(), product.getId())) {
                    throw new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND);
                }
                systemQty = targetBatch.getQuantityIn() != null ? targetBatch.getQuantityIn() : 0;
            } else {
                systemQty = resolveProductSystemQty(product.getId());
            }

            int actualQty = lineReq.getActualQty();
            int adjustQty = lineReq.getStockAdjustQty() != null
                    ? lineReq.getStockAdjustQty()
                    : actualQty;
            int delta = adjustQty - systemQty;

            InventoryCheckDetail detail = new InventoryCheckDetail();
            detail.setInventoryCheck(savedCheck);
            detail.setProduct(product);
            detail.setStockBatch(targetBatch);
            detail.setSystemQty(systemQty);
            detail.setActualQty(actualQty);
            detail.setNote(trimToNull(lineReq.getNote()));
            detail.setIsRemoved(false);
            inventoryCheckDetailRepository.save(detail);

            if (delta != 0) {
                if (targetBatch != null) {
                    applySingleBatchAdjustment(targetBatch, delta, savedCheck);
                } else {
                    applyProductStockAdjustment(product, delta, savedCheck);
                }
            }
        }

        InventoryCheck refreshed = inventoryCheckRepository.findDetailById(savedCheck.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INVENTORY_CHECK_NOT_FOUND));
        return toDetailResponse(refreshed);
    }

    private String lineKey(Integer productId, Integer stockBatchId) {
        return productId + ":" + (stockBatchId == null ? "ALL" : stockBatchId);
    }

    private InventoryCheckAttentionItemResponse toAttentionItem(
            StockBatch batch, String reasonCode, String reason) {
        Product product = batch.getProduct();
        return InventoryCheckAttentionItemResponse.builder()
                .productId(product.getId())
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .batchId(batch.getId())
                .batchCode(batch.getBatchCode())
                .reasonCode(reasonCode)
                .reason(reason)
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .quantity(batch.getQuantityIn())
                .build();
    }

    private int resolveProductSystemQty(Integer productId) {
        List<StockBatch> batches = stockBatchRepository.findAvailableByProductId(productId);
        return batches.stream()
                .mapToInt(b -> b.getQuantityIn() != null ? b.getQuantityIn() : 0)
                .sum();
    }

    /**
     * delta &lt; 0: trừ tồn FEFO theo lô + kệ.
     * delta &gt; 0: cộng vào lô gần nhất (hoặc tạo lô điều chỉnh chưa xếp kệ).
     */
    private void applyProductStockAdjustment(Product product, int delta, InventoryCheck check) {
        if (delta < 0) {
            deductProductStock(product.getId(), -delta, check.getId());
            return;
        }
        increaseProductStock(product, delta, check);
    }

    private void applySingleBatchAdjustment(StockBatch batch, int delta, InventoryCheck check) {
        int current = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        if (delta < 0) {
            int need = -delta;
            int deduct = Math.min(current, need);
            int next = current - deduct;
            batch.setQuantityIn(next);
            stockBatchRepository.save(batch);
            deductFromBatchLocations(batch, deduct);
            saveMovement(batch, check.getId(), -deduct, next);
            return;
        }

        int next = current + delta;
        batch.setQuantityIn(next);
        stockBatchRepository.save(batch);
        saveMovement(batch, check.getId(), delta, next);
    }

    private void saveMovement(StockBatch batch, Integer checkId, int quantityDelta, int stockAfter) {
        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setMovementType(MOVEMENT_TYPE);
        movement.setReferenceType(REFERENCE_TYPE);
        movement.setReferenceId(checkId);
        movement.setQuantityDelta(quantityDelta);
        movement.setStockAfter(stockAfter);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);
    }

    private void deductProductStock(Integer productId, int quantityNeed, Integer checkId) {
        List<StockBatch> batches = stockBatchRepository.findAvailableByProductId(productId);
        int remaining = quantityNeed;

        for (StockBatch batch : batches) {
            if (remaining <= 0) {
                break;
            }
            int batchQty = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
            if (batchQty <= 0) {
                continue;
            }

            int deduct = Math.min(batchQty, remaining);
            int nextBatchQty = batchQty - deduct;
            batch.setQuantityIn(nextBatchQty);
            stockBatchRepository.save(batch);

            deductFromBatchLocations(batch, deduct);

            StockMovement movement = new StockMovement();
            movement.setStockBatch(batch);
            movement.setMovementType(MOVEMENT_TYPE);
            movement.setReferenceType(REFERENCE_TYPE);
            movement.setReferenceId(checkId);
            movement.setQuantityDelta(-deduct);
            movement.setStockAfter(nextBatchQty);
            movement.setIsRemoved(false);
            stockMovementRepository.save(movement);

            remaining -= deduct;
        }

        // Cho phép kiểm thiếu hơn tồn hệ thống: phần còn lại coi như đã ghi nhận trên phiếu
    }

    private void deductFromBatchLocations(StockBatch batch, int quantityToDeduct) {
        List<BatchLocation> locations = batchLocationRepository
                .findAvailableByProductId(batch.getProduct().getId())
                .stream()
                .filter(bl -> Objects.equals(bl.getBatch().getId(), batch.getId()))
                .toList();

        int remaining = quantityToDeduct;
        for (BatchLocation bl : locations) {
            if (remaining <= 0) {
                break;
            }
            int qty = bl.getQuantity() != null ? bl.getQuantity() : 0;
            if (qty <= 0) {
                continue;
            }
            int deduct = Math.min(qty, remaining);
            int next = qty - deduct;
            if (next <= 0) {
                bl.setQuantity(0);
                bl.setIsRemoved(true);
            } else {
                bl.setQuantity(next);
            }
            batchLocationRepository.save(bl);
            remaining -= deduct;
        }
    }

    private void increaseProductStock(Product product, int delta, InventoryCheck check) {
        List<StockBatch> batches = stockBatchRepository.findAvailableByProductId(product.getId());
        StockBatch target = batches.stream()
                .max(Comparator
                        .comparing(StockBatch::getReceivedDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(StockBatch::getId, Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElse(null);

        if (target == null) {
            target = new StockBatch();
            target.setProduct(product);
            target.setImportOrder(null);
            target.setBatchCode("ADJ-" + check.getCheckCode());
            target.setCostPerUnit(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO);
            target.setQuantityIn(0);
            target.setReceivedDate(LocalDate.now());
            target.setIsRemoved(false);
        }

        int current = target.getQuantityIn() != null ? target.getQuantityIn() : 0;
        int next = current + delta;
        target.setQuantityIn(next);
        StockBatch saved = stockBatchRepository.save(target);

        StockMovement movement = new StockMovement();
        movement.setStockBatch(saved);
        movement.setMovementType(MOVEMENT_TYPE);
        movement.setReferenceType(REFERENCE_TYPE);
        movement.setReferenceId(check.getId());
        movement.setQuantityDelta(delta);
        movement.setStockAfter(next);
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);
    }

    private InventoryCheckProductPreviewResponse toProductPreview(Product product) {
        List<StockBatch> batches = stockBatchRepository.findAvailableWithImportByProductId(product.getId());
        List<InventoryCheckProductPreviewResponse.BatchOption> options = batches.stream()
                .map(this::toBatchOption)
                .toList();
        int systemQty = options.stream().mapToInt(b -> b.getQuantity() != null ? b.getQuantity() : 0).sum();

        return InventoryCheckProductPreviewResponse.builder()
                .productId(product.getId())
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .systemQty(systemQty)
                .importPrice(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO)
                .batches(options)
                .build();
    }

    private InventoryCheckProductPreviewResponse.BatchOption toBatchOption(StockBatch batch) {
        ImportOrder importOrder = batch.getImportOrder();
        Supplier supplier = importOrder != null ? importOrder.getSupplier() : null;
        return InventoryCheckProductPreviewResponse.BatchOption.builder()
                .id(batch.getId())
                .batchCode(batch.getBatchCode())
                .quantity(batch.getQuantityIn() != null ? batch.getQuantityIn() : 0)
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .importOrderId(importOrder != null ? importOrder.getId() : null)
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .build();
    }

    private InventoryCheckListItemResponse toListItem(
            InventoryCheck check, Map<Integer, String> names) {
        String checker = names.get(check.getCreatedBy());
        return InventoryCheckListItemResponse.builder()
                .id(check.getId())
                .code(check.getCheckCode())
                .checkDate(formatInstant(check.getCheckDate()))
                .checker(checker)
                .note(check.getNote())
                .status(check.getStatus())
                .warehouse(check.getWarehouse())
                .createdAt(formatInstant(check.getCreatedAt()))
                .createdBy(checker)
                .build();
    }

    private InventoryCheckDetailResponse toDetailResponse(InventoryCheck check) {
        String checker = resolveCreatedByName(check.getCreatedBy());
        List<InventoryCheckLineResponse> lines = check.getDetails().stream()
                .filter(detail -> !Boolean.TRUE.equals(detail.getIsRemoved()))
                .sorted(Comparator.comparing(InventoryCheckDetail::getId,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toLineResponse)
                .toList();

        return InventoryCheckDetailResponse.builder()
                .id(check.getId())
                .code(check.getCheckCode())
                .checkDate(formatInstant(check.getCheckDate()))
                .checker(checker)
                .note(check.getNote())
                .generalNote(check.getNote())
                .status(check.getStatus())
                .warehouse(check.getWarehouse())
                .createdAt(formatInstant(check.getCreatedAt()))
                .createdBy(checker)
                .lines(lines)
                .build();
    }

    private InventoryCheckLineResponse toLineResponse(InventoryCheckDetail detail) {
        Product product = detail.getProduct();
        StockBatch batch = detail.getStockBatch();
        return InventoryCheckLineResponse.builder()
                .id(detail.getId())
                .productId(product != null ? product.getId() : null)
                .productCode(product != null ? resolveProductCode(product) : null)
                .productName(product != null ? product.getName() : null)
                .unit(product != null ? resolveBaseUnitName(product.getId()) : "Cái")
                .stockBatchId(batch != null ? batch.getId() : null)
                .batchCode(batch != null ? batch.getBatchCode() : null)
                .systemQty(detail.getSystemQty())
                .actualQty(detail.getActualQty())
                .importPrice(product != null && product.getCostPrice() != null
                        ? product.getCostPrice()
                        : BigDecimal.ZERO)
                .note(detail.getNote())
                .build();
    }

    private String generateCheckCode(Instant when) {
        LocalDate date = LocalDate.ofInstant(when, ZoneId.systemDefault());
        String datePart = date.format(DateTimeFormatter.BASIC_ISO_DATE);
        int suffix = ThreadLocalRandom.current().nextInt(10, 99);
        return "PKK-" + datePart + "-" + suffix;
    }

    private PageResponse<InventoryCheckListItemResponse> paginate(
            List<InventoryCheckListItemResponse> items, int page, int size) {
        int safeSize = Math.max(size, 1);
        int totalElements = items.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        int safePage = Math.min(Math.max(page, 0), totalPages - 1);
        int from = safePage * safeSize;
        int to = Math.min(from + safeSize, totalElements);
        List<InventoryCheckListItemResponse> content =
                totalElements == 0 ? List.of() : items.subList(from, to);

        return PageResponse.<InventoryCheckListItemResponse>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    private Map<Integer, String> resolveCreatedByNames(List<InventoryCheck> checks) {
        List<Integer> userIds = checks.stream()
                .map(InventoryCheck::getCreatedBy)
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
        return productUnitRepository.findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(productId)
                .stream()
                .findFirst()
                .map(ProductUnit::getName)
                .orElse("Cái");
    }

    private String formatInstant(Instant value) {
        return value != null ? value.toString() : null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
