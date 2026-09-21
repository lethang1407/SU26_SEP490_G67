package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.StorageLocationConstants;
import project.be_sep490_g67.constants.StorageZoneConstants;
import project.be_sep490_g67.constants.StorageZoneType;
import project.be_sep490_g67.dto.request.AssignBatchRequest;
import project.be_sep490_g67.dto.request.CancelReturnHoldRequest;
import project.be_sep490_g67.dto.request.CreateStorageLocationRequest;
import project.be_sep490_g67.dto.request.MoveAllBatchesRequest;
import project.be_sep490_g67.dto.request.MoveBatchRequest;
import project.be_sep490_g67.dto.request.ReleaseReturnHoldRequest;
import project.be_sep490_g67.dto.request.UnassignBatchRequest;
import project.be_sep490_g67.dto.response.StorageLocationContentResponse;
import project.be_sep490_g67.dto.response.StorageLocationResponse;
import project.be_sep490_g67.dto.response.UnplacedBatchResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.ReturnOrderDetail;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.entity.StorageZone;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.ReturnOrderDetailRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StockMovementRepository;
import project.be_sep490_g67.repository.StorageLocationRepository;
import project.be_sep490_g67.utils.StockBatchUtils;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StorageLocationService {

    StorageLocationRepository storageLocationRepository;
    BatchLocationRepository batchLocationRepository;
    StockBatchRepository stockBatchRepository;
    ProductUnitRepository productUnitRepository;
    StorageZoneService storageZoneService;
    StockMovementRepository stockMovementRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;

    @Transactional
    public List<StorageLocationResponse> getAllLocations() {
        backfillUnplacedIntoReceiving();
        return storageLocationRepository.findAllActiveWithContents().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StorageLocationResponse getLocationById(Integer locationId) {
        StorageLocation location = storageLocationRepository.findActiveWithContentsById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        return toResponse(location);
    }

    /**
     * Hàng “chưa xếp” = tồn tại vị trí nhận NHAP-MOI.
     * Backfill legacy (lô còn số chưa gán ô) vào NHAP-MOI trước khi trả danh sách.
     */
    @Transactional
    public List<UnplacedBatchResponse> getUnplacedBatches() {
        backfillUnplacedIntoReceiving();
        StorageLocation receiving = requireReceivingLocation();
        return batchLocationRepository.findActiveByLocationId(receiving.getId()).stream()
                .map(this::toUnplacedFromBatchLocation)
                .toList();
    }

    @Transactional
    public StorageLocationResponse createLocation(CreateStorageLocationRequest request) {
        String zone = request.getZone().trim().toUpperCase();
        String shelf = trimToNull(request.getShelf());
        String bin = trimToNull(request.getBin());
        String size = StorageLocationConstants.normalizeSize(request.getSize());

        if (!StorageLocationConstants.isValidSize(size)) {
            throw new AppException(ErrorCode.INVALID_STORAGE_LOCATION_SIZE);
        }

        boolean hasShelf = shelf != null;
        boolean hasBin = bin != null;
        if (hasShelf != hasBin) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_SLOT_INCOMPLETE);
        }

        if (hasShelf) {
            if (storageLocationRepository.existsByStorageZone_CodeIgnoreCaseAndShelfAndBinAndIsRemovedFalse(
                    zone, shelf, bin)) {
                throw new AppException(ErrorCode.STORAGE_LOCATION_SLOT_EXISTED);
            }
        }

        String label = request.getLabel() == null || request.getLabel().isBlank()
                ? null
                : request.getLabel().trim();
        if (label == null) {
            if (hasShelf) {
                label = StorageLocationConstants.buildLabel(zone, shelf, bin);
            } else {
                throw new AppException(ErrorCode.STORAGE_LOCATION_LABEL_REQUIRED);
            }
        }

        if (storageLocationRepository.existsByLabelIgnoreCaseAndIsRemovedFalse(label)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_LABEL_EXISTED);
        }

        StorageZone zoneEntity = storageZoneService.ensureZoneExists(zone);
        if (storageZoneService.isReturnHoldZone(zoneEntity)) {
            throw new AppException(ErrorCode.STORAGE_RETURN_HOLD_LOCKED);
        }
        if (StorageZoneType.RECEIVING_ZONE_CODE.equalsIgnoreCase(zoneEntity.getCode())
                || StorageZoneType.RECEIVING_LOCATION_LABEL.equalsIgnoreCase(label)
                || "NHAP-MOI".equalsIgnoreCase(label)) {
            throw new AppException(ErrorCode.STORAGE_RETURN_HOLD_LOCKED);
        }

        StorageLocation location = new StorageLocation();
        location.setStorageZone(zoneEntity);
        location.setLabel(label);
        location.setAisle(null);
        location.setShelf(shelf);
        location.setBin(bin);
        location.setSize(size);
        location.setDescription(trimToNull(request.getDescription()));
        location.setIsFull(false);
        location.setIsActive(true);
        location.setIsRemoved(false);

        return toResponse(storageLocationRepository.save(location));
    }

    @Transactional
    public StorageLocationResponse setLocationFull(Integer locationId, boolean isFull) {
        StorageLocation location = storageLocationRepository.findActiveWithContentsById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        if (isFull && !hasActiveStock(location)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_EMPTY_CANNOT_MARK_FULL);
        }
        location.setIsFull(isFull);
        storageLocationRepository.save(location);
        return toResponse(location);
    }

    /**
     * Xếp lô vào ô đích. Ưu tiên số lượng “thật sự chưa gán ô” (legacy);
     * nếu không còn thì chuyển từ vị trí nhận NHAP-MOI.
     */
    @Transactional
    public StorageLocationResponse assignBatch(AssignBatchRequest request) {
        StockBatch batch = stockBatchRepository.findActiveWithProductById(request.getBatchId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));

        StorageLocation location = storageLocationRepository.findActiveWithContentsById(request.getLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        assertNotFull(location);

        int remaining = getUnplacedQuantity(batch);
        if (remaining > 0) {
            int quantity = request.getQuantity() != null ? request.getQuantity() : remaining;
            if (quantity < 1 || quantity > remaining) {
                throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
            }
            upsertBatchLocation(batch, location, quantity);
            return toResponse(storageLocationRepository.findActiveWithContentsById(location.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND)));
        }

        StorageLocation receiving = requireReceivingLocation();
        if (Objects.equals(receiving.getId(), location.getId())) {
            throw new AppException(ErrorCode.INVALID_BATCH_LOCATION_MOVE);
        }

        BatchLocation source = batchLocationRepository
                .findActiveByBatchIdAndLocationId(batch.getId(), receiving.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY));

        int available = source.getQuantity() != null ? source.getQuantity() : 0;
        int quantity = request.getQuantity() != null ? request.getQuantity() : available;
        if (quantity < 1 || quantity > available) {
            throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
        }

        int remainingOnSource = available - quantity;
        if (remainingOnSource <= 0) {
            source.setQuantity(0);
            source.setIsRemoved(true);
        } else {
            source.setQuantity(remainingOnSource);
        }
        batchLocationRepository.save(source);
        upsertBatchLocation(batch, location, quantity);
        clearFullIfEmpty(receiving.getId());

        return toResponse(storageLocationRepository.findActiveWithContentsById(location.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND)));
    }

    @Transactional
    public StorageLocationResponse moveBatch(MoveBatchRequest request) {
        BatchLocation source = batchLocationRepository.findActiveWithDetailsById(request.getBatchLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));

        if (Objects.equals(source.getLocation().getId(), request.getToLocationId())) {
            throw new AppException(ErrorCode.INVALID_BATCH_LOCATION_MOVE);
        }

        StorageLocation destination = storageLocationRepository.findActiveWithContentsById(request.getToLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        assertNotFull(destination);

        int available = source.getQuantity() != null ? source.getQuantity() : 0;
        int quantity = request.getQuantity() != null ? request.getQuantity() : available;
        if (quantity < 1 || quantity > available) {
            throw new AppException(ErrorCode.INSUFFICIENT_BATCH_LOCATION_QUANTITY);
        }

        StockBatch batch = source.getBatch();

        int remainingOnSource = available - quantity;
        if (remainingOnSource <= 0) {
            source.setQuantity(0);
            source.setIsRemoved(true);
        } else {
            source.setQuantity(remainingOnSource);
        }
        batchLocationRepository.save(source);

        upsertBatchLocation(batch, destination, quantity);

        clearFullIfEmpty(source.getLocation().getId());

        StorageLocation refreshed = storageLocationRepository.findActiveWithContentsById(destination.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        return toResponse(refreshed);
    }

    @Transactional
    public StorageLocationResponse moveAllBatches(MoveAllBatchesRequest request) {
        if (Objects.equals(request.getFromLocationId(), request.getToLocationId())) {
            throw new AppException(ErrorCode.INVALID_BATCH_LOCATION_MOVE);
        }

        StorageLocation source = storageLocationRepository.findActiveWithContentsById(request.getFromLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        StorageLocation destination = storageLocationRepository.findActiveWithContentsById(request.getToLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        assertNotFull(destination);

        List<BatchLocation> activeLines = source.getBatchLocations().stream()
                .filter(bl -> !Boolean.TRUE.equals(bl.getIsRemoved()))
                .filter(bl -> bl.getQuantity() != null && bl.getQuantity() > 0)
                .sorted(Comparator.comparing(BatchLocation::getId))
                .toList();

        if (activeLines.isEmpty()) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_NO_BATCHES_TO_MOVE);
        }

        for (BatchLocation line : activeLines) {
            StockBatch batch = line.getBatch();

            int quantity = line.getQuantity();
            line.setQuantity(0);
            line.setIsRemoved(true);
            batchLocationRepository.save(line);
            upsertBatchLocation(batch, destination, quantity);

            destination = storageLocationRepository.findActiveWithContentsById(destination.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        }

        clearFullIfEmpty(source.getId());

        return toResponse(destination);
    }

    /** Gỡ khỏi kệ → trả về vị trí nhận NHAP-MOI (không để “treo” ngoài mọi ô). */
    @Transactional
    public void unassignBatch(UnassignBatchRequest request) {
        BatchLocation batchLocation = batchLocationRepository.findActiveWithDetailsById(request.getBatchLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));

        StorageLocation receiving = requireReceivingLocation();
        Integer locationId = batchLocation.getLocation().getId();
        if (Objects.equals(locationId, receiving.getId())) {
            return;
        }

        int quantity = batchLocation.getQuantity() != null ? batchLocation.getQuantity() : 0;
        StockBatch batch = batchLocation.getBatch();
        batchLocation.setQuantity(0);
        batchLocation.setIsRemoved(true);
        batchLocationRepository.save(batchLocation);
        if (quantity > 0) {
            upsertBatchLocation(batch, receiving, quantity);
        }
        clearFullIfEmpty(locationId);
    }

    public StorageLocation requireReceivingLocation() {
        return storageLocationRepository.findReceivingLocation()
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
    }

    /** Đưa phần tồn chưa gán ô (legacy) vào NHAP-MOI — idempotent. */
    private void backfillUnplacedIntoReceiving() {
        StorageLocation receiving = requireReceivingLocation();
        for (StockBatch batch : stockBatchRepository.findUnplacedBatches()) {
            int qty = getUnplacedQuantity(batch);
            if (qty > 0) {
                upsertBatchLocation(batch, receiving, qty);
            }
        }
    }

    /** Đẩy hàng từ RT-HOLD sang ô kho bán được. */
    @Transactional
    public StorageLocationResponse releaseReturnHold(ReleaseReturnHoldRequest request, Integer userId) {
        BatchLocation source = requireReturnHoldLine(request.getBatchLocationId());

        StorageLocation destination = storageLocationRepository.findActiveWithContentsById(request.getToLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        if (storageZoneService.isReturnHoldZone(destination.getStorageZone())) {
            throw new AppException(ErrorCode.RETURN_HOLD_TARGET_INVALID);
        }
        assertNotFull(destination);

        int available = source.getQuantity() != null ? source.getQuantity() : 0;
        int quantity = request.getQuantity() != null ? request.getQuantity() : available;
        if (quantity < 1 || quantity > available) {
            throw new AppException(ErrorCode.RETURN_HOLD_INSUFFICIENT_QTY);
        }

        StockBatch batch = source.getBatch();
        int remainingOnSource = available - quantity;
        if (remainingOnSource <= 0) {
            source.setQuantity(0);
            source.setIsRemoved(true);
        } else {
            source.setQuantity(remainingOnSource);
        }
        batchLocationRepository.save(source);

        upsertBatchLocation(batch, destination, quantity);
        clearFullIfEmpty(source.getLocation().getId());
        markReturnOrderDetailsProcessed(
                batch.getId(),
                batch.getProduct() != null ? batch.getProduct().getId() : null,
                quantity,
                userId);

        return toResponse(storageLocationRepository.findActiveWithContentsById(destination.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND)));
    }

    /** Hủy hàng đang nằm ở RT-HOLD (ghi CANCEL_BATCH). */
    @Transactional
    public StorageLocationResponse cancelReturnHold(CancelReturnHoldRequest request, Integer userId) {
        BatchLocation source = requireReturnHoldLine(request.getBatchLocationId());

        int available = source.getQuantity() != null ? source.getQuantity() : 0;
        int quantity = request.getQuantity() != null ? request.getQuantity() : available;
        if (quantity < 1 || quantity > available) {
            throw new AppException(ErrorCode.RETURN_HOLD_INSUFFICIENT_QTY);
        }

        StockBatch batch = source.getBatch();
        int remainingOnSource = available - quantity;
        if (remainingOnSource <= 0) {
            source.setQuantity(0);
            source.setIsRemoved(true);
        } else {
            source.setQuantity(remainingOnSource);
        }
        batchLocationRepository.save(source);

        int ledgerAfter = stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId()) - quantity;
        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setBatchLocation(source);
        movement.setMovementType("CANCEL_BATCH");
        movement.setReferenceType("STOCK_BATCH");
        movement.setReferenceId(batch.getId());
        movement.setQuantityDelta(-quantity);
        movement.setStockAfter(Math.max(0, ledgerAfter));
        movement.setIsRemoved(false);
        stockMovementRepository.save(movement);

        clearFullIfEmpty(source.getLocation().getId());
        markReturnOrderDetailsProcessed(
                batch.getId(),
                batch.getProduct() != null ? batch.getProduct().getId() : null,
                quantity,
                userId);

        StorageLocation hold = storageLocationRepository.findActiveWithContentsById(source.getLocation().getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        return toResponse(hold);
    }

    private BatchLocation requireReturnHoldLine(Integer batchLocationId) {
        BatchLocation line = batchLocationRepository.findActiveWithDetailsById(batchLocationId)
                .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));
        if (line.getLocation() == null
                || !storageZoneService.isReturnHoldZone(line.getLocation().getStorageZone())) {
            throw new AppException(ErrorCode.RETURN_HOLD_LINE_REQUIRED);
        }
        return line;
    }

    private void markReturnOrderDetailsProcessed(
            Integer batchId, Integer productId, int quantity, Integer userId) {
        if (quantity <= 0 || batchId == null || productId == null) {
            return;
        }
        List<String> conditions = List.of(
                ItemCondition.DAMAGED.name(),
                ItemCondition.EXPIRED.name(),
                ItemCondition.OPENED.name());
        List<ReturnOrderDetail> waiting = returnOrderDetailRepository
                .findAwaitingProcessingByBatchOrProduct(batchId, productId, conditions);
        int remaining = quantity;
        Instant now = Instant.now();
        for (ReturnOrderDetail detail : waiting) {
            if (remaining <= 0) {
                break;
            }
            detail.setProcessedAt(now);
            detail.setProcessedBy(userId);
            returnOrderDetailRepository.save(detail);
            remaining -= detail.getQuantity() != null ? detail.getQuantity() : 0;
        }
    }

    /** Gỡ đánh dấu đầy khi ô không còn hàng. */
    private void clearFullIfEmpty(Integer locationId) {
        if (locationId == null) {
            return;
        }
        storageLocationRepository.findActiveWithContentsById(locationId).ifPresent(location -> {
            if (Boolean.TRUE.equals(location.getIsFull()) && !hasActiveStock(location)) {
                location.setIsFull(false);
                storageLocationRepository.save(location);
            }
        });
    }

    private void upsertBatchLocation(StockBatch batch, StorageLocation location, int quantity) {
        BatchLocation existing = batchLocationRepository
                .findActiveByBatchIdAndLocationId(batch.getId(), location.getId())
                .orElse(null);

        if (existing != null) {
            int current = existing.getQuantity() != null ? existing.getQuantity() : 0;
            existing.setQuantity(current + quantity);
            batchLocationRepository.save(existing);
            return;
        }

        BatchLocation created = new BatchLocation();
        created.setBatch(batch);
        created.setLocation(location);
        created.setQuantity(quantity);
        created.setIsRemoved(false);
        batchLocationRepository.save(created);
    }

    private void assertNotFull(StorageLocation location) {
        if (!Boolean.TRUE.equals(location.getIsFull())) {
            return;
        }
        // Ô trống không được giữ đánh dấu đầy
        if (!hasActiveStock(location)) {
            location.setIsFull(false);
            storageLocationRepository.save(location);
            return;
        }
        throw new AppException(ErrorCode.STORAGE_LOCATION_FULL);
    }

    private boolean hasActiveStock(StorageLocation location) {
        if (location.getBatchLocations() == null) {
            return false;
        }
        return location.getBatchLocations().stream()
                .anyMatch(batchLocation ->
                        !Boolean.TRUE.equals(batchLocation.getIsRemoved())
                                && batchLocation.getQuantity() != null
                                && batchLocation.getQuantity() > 0);
    }

    /**
     * Số chưa xếp kệ = tồn thực theo sổ cái (cộng/trừ movements) trừ phần đã gán ô.
     * Không dùng {@code quantityIn - placed} vì bán hàng chỉ trừ {@code batch_locations}
     * mà không trừ {@code quantityIn}, khiến hàng vừa bán bị tính nhầm vào “chưa xếp”.
     */
    private int getUnplacedQuantity(StockBatch batch) {
        int remaining = stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId());
        Integer placed = batchLocationRepository.sumQuantityByBatchId(batch.getId());
        int placedQty = placed != null ? placed : 0;
        return Math.max(0, remaining - placedQty);
    }

    private StorageLocationResponse toResponse(StorageLocation location) {
        StorageZone zone = location.getStorageZone();
        String zoneCode = zone != null ? zone.getCode() : null;
        String zoneType = zone != null && zone.getZoneType() != null
                ? zone.getZoneType()
                : StorageZoneType.WAREHOUSE;
        String zoneTitle = zone != null && zone.getTitle() != null && !zone.getTitle().isBlank()
                ? zone.getTitle()
                : StorageZoneConstants.resolveZoneTitle(zoneCode);

        boolean receiving = isReceivingLocation(location);
        return StorageLocationResponse.builder()
                .id(location.getId())
                .label(location.getLabel())
                .displayLabel(receiving
                        ? StorageZoneType.RECEIVING_DISPLAY_NAME
                        : location.getLabel())
                .zone(zoneCode)
                .zoneId(zone != null ? zone.getId() : null)
                .zoneTitle(receiving
                        ? StorageZoneType.RECEIVING_DISPLAY_NAME
                        : zoneTitle)
                .aisle(location.getAisle())
                .shelf(location.getShelf())
                .bin(location.getBin())
                .size(location.getSize() != null
                        ? location.getSize()
                        : StorageLocationConstants.SIZE_MD)
                .description(location.getDescription())
                .isFull(Boolean.TRUE.equals(location.getIsFull()) && hasActiveStock(location))
                .zoneType(zoneType)
                .contents(mapContents(location))
                .build();
    }

    private boolean isReceivingLocation(StorageLocation location) {
        if (location == null) {
            return false;
        }
        String label = location.getLabel();
        if (label != null
                && (StorageZoneType.RECEIVING_LOCATION_LABEL.equalsIgnoreCase(label)
                        || "NHAP-MOI".equalsIgnoreCase(label))) {
            return true;
        }
        StorageZone zone = location.getStorageZone();
        return zone != null
                && StorageZoneType.RECEIVING_ZONE_CODE.equalsIgnoreCase(zone.getCode());
    }

    private List<StorageLocationContentResponse> mapContents(StorageLocation location) {
        return location.getBatchLocations().stream()
                .filter(batchLocation -> !Boolean.TRUE.equals(batchLocation.getIsRemoved()))
                .filter(batchLocation -> batchLocation.getQuantity() != null && batchLocation.getQuantity() > 0)
                .sorted(Comparator.comparing(BatchLocation::getId))
                .map(this::toContentResponse)
                .toList();
    }

    private StorageLocationContentResponse toContentResponse(BatchLocation batchLocation) {
        StockBatch batch = batchLocation.getBatch();
        Product product = batch.getProduct();

        return StorageLocationContentResponse.builder()
                .id(batchLocation.getId())
                .batchId(batch.getId())
                .productId(product.getId())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode(StockBatchUtils.resolveBatchCode(batch))
                .quantity(batchLocation.getQuantity())
                .importPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : product.getCostPrice())
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .receivedDate(batch.getReceivedDate() != null ? batch.getReceivedDate().toString() : null)
                .placedAt(resolvePlacedAt(batchLocation))
                .build();
    }

    private String resolvePlacedAt(BatchLocation batchLocation) {
        if (batchLocation.getUpdatedAt() != null) {
            return batchLocation.getUpdatedAt().toString();
        }
        if (batchLocation.getCreatedAt() != null) {
            return batchLocation.getCreatedAt().toString();
        }
        return null;
    }

    private UnplacedBatchResponse toUnplacedFromBatchLocation(BatchLocation batchLocation) {
        StockBatch batch = batchLocation.getBatch();
        Product product = batch.getProduct();
        return UnplacedBatchResponse.builder()
                .id(batchLocation.getId())
                .batchLocationId(batchLocation.getId())
                .batchId(batch.getId())
                .productId(product.getId())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode(StockBatchUtils.resolveBatchCode(batch))
                .quantity(batchLocation.getQuantity())
                .importPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : product.getCostPrice())
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .build();
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
