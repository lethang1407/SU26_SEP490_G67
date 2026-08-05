package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateInventoryCheckRequest;
import project.be_sep490_g67.dto.response.AvailableBatchLocationResponse;
import project.be_sep490_g67.dto.response.InventoryCheckDetailResponse;
import project.be_sep490_g67.dto.response.InventoryCheckLineResponse;
import project.be_sep490_g67.dto.response.InventoryCheckListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.InventoryCheck;
import project.be_sep490_g67.entity.InventoryCheckDetail;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.InventoryCheckDetailRepository;
import project.be_sep490_g67.repository.InventoryCheckRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
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
    public List<AvailableBatchLocationResponse> getAvailableLines(String locationLabel) {
        return batchLocationRepository.findActiveAvailableLines(locationLabel).stream()
                .map(this::toAvailableLine)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, String>> getLocationOptions() {
        return batchLocationRepository.findActiveAvailableLines("all").stream()
                .map(bl -> bl.getLocation().getLabel())
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .map(label -> Map.of("value", label, "label", label))
                .toList();
    }

    /**
     * Tạo phiếu kiểm kho và hoàn tất ngay: điều chỉnh batch_locations + stock_batches.
     */
    @Transactional
    public InventoryCheckDetailResponse createCheck(CreateInventoryCheckRequest request, Integer createdBy) {
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new AppException(ErrorCode.INVENTORY_CHECK_ITEMS_EMPTY);
        }

        Set<Integer> seen = new HashSet<>();
        for (CreateInventoryCheckRequest.InventoryCheckLineRequest line : request.getLines()) {
            if (!seen.add(line.getBatchLocationId())) {
                throw new AppException(ErrorCode.INVENTORY_CHECK_DUPLICATE_LINE);
            }
            if (line.getActualQty() == null || line.getActualQty() < 0) {
                throw new AppException(ErrorCode.INVALID_INVENTORY_CHECK_QTY);
            }
        }

        Instant now = Instant.now();
        InventoryCheck check = new InventoryCheck();
        check.setCheckCode(generateCheckCode(now));
        check.setCheckDate(now);
        check.setStatus(STATUS_COMPLETED);
        check.setWarehouse(
                request.getWarehouse() == null || request.getWarehouse().isBlank()
                        ? DEFAULT_WAREHOUSE
                        : request.getWarehouse().trim());
        check.setNote(trimToNull(request.getNote()));
        check.setIsRemoved(false);

        InventoryCheck savedCheck = inventoryCheckRepository.save(check);

        for (CreateInventoryCheckRequest.InventoryCheckLineRequest lineReq : request.getLines()) {
            BatchLocation batchLocation = batchLocationRepository
                    .findActiveWithDetailsById(lineReq.getBatchLocationId())
                    .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));

            int systemQty = batchLocation.getQuantity() != null ? batchLocation.getQuantity() : 0;
            int actualQty = lineReq.getActualQty();
            int delta = actualQty - systemQty;

            InventoryCheckDetail detail = new InventoryCheckDetail();
            detail.setInventoryCheck(savedCheck);
            detail.setBatchLocation(batchLocation);
            detail.setSystemQty(systemQty);
            detail.setActualQty(actualQty);
            detail.setNote(trimToNull(lineReq.getNote()));
            detail.setIsRemoved(false);
            inventoryCheckDetailRepository.save(detail);

            applyStockAdjustment(batchLocation, actualQty, delta, savedCheck.getId());
        }

        InventoryCheck refreshed = inventoryCheckRepository.findDetailById(savedCheck.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INVENTORY_CHECK_NOT_FOUND));
        return toDetailResponse(refreshed);
    }

    private void applyStockAdjustment(
            BatchLocation batchLocation, int actualQty, int delta, Integer checkId) {

        StockBatch batch = batchLocation.getBatch();

        if (actualQty <= 0) {
            batchLocation.setQuantity(0);
            batchLocation.setIsRemoved(true);
        } else {
            batchLocation.setQuantity(actualQty);
        }
        batchLocationRepository.save(batchLocation);

        int currentBatchQty = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        int nextBatchQty = Math.max(0, currentBatchQty + delta);
        batch.setQuantityIn(nextBatchQty);
        stockBatchRepository.save(batch);

        if (delta != 0) {
            StockMovement movement = new StockMovement();
            movement.setStockBatch(batch);
            movement.setMovementType(MOVEMENT_TYPE);
            movement.setReferenceType(REFERENCE_TYPE);
            movement.setReferenceId(checkId);
            movement.setQuantityDelta(delta);
            movement.setStockAfter(nextBatchQty);
            movement.setIsRemoved(false);
            stockMovementRepository.save(movement);
        }
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
        BatchLocation bl = detail.getBatchLocation();
        StockBatch batch = bl.getBatch();
        Product product = batch.getProduct();

        return InventoryCheckLineResponse.builder()
                .id(detail.getId())
                .batchLocationId(bl.getId())
                .batchId(batch.getId())
                .locationId(bl.getLocation() != null ? bl.getLocation().getId() : null)
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode("BATCH-" + batch.getId())
                .locationLabel(bl.getLocation() != null ? bl.getLocation().getLabel() : null)
                .systemQty(detail.getSystemQty())
                .actualQty(detail.getActualQty())
                .importPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : product.getCostPrice())
                .note(detail.getNote())
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .build();
    }

    private AvailableBatchLocationResponse toAvailableLine(BatchLocation bl) {
        StockBatch batch = bl.getBatch();
        Product product = batch.getProduct();
        return AvailableBatchLocationResponse.builder()
                .id(bl.getId())
                .batchId(batch.getId())
                .locationId(bl.getLocation().getId())
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode("BATCH-" + batch.getId())
                .locationLabel(bl.getLocation().getLabel())
                .systemQty(bl.getQuantity())
                .importPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : product.getCostPrice())
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
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
