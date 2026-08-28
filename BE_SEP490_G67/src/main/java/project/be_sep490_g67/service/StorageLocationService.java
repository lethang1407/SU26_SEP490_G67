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
import project.be_sep490_g67.dto.request.CreateStorageLocationRequest;
import project.be_sep490_g67.dto.request.MoveAllBatchesRequest;
import project.be_sep490_g67.dto.request.MoveBatchRequest;
import project.be_sep490_g67.dto.request.UnassignBatchRequest;
import project.be_sep490_g67.dto.response.StorageLocationContentResponse;
import project.be_sep490_g67.dto.response.StorageLocationResponse;
import project.be_sep490_g67.dto.response.UnplacedBatchResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.entity.StorageZone;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StorageLocationRepository;
import project.be_sep490_g67.utils.StockBatchUtils;

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

    @Transactional(readOnly = true)
    public List<StorageLocationResponse> getAllLocations() {
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

    @Transactional(readOnly = true)
    public List<UnplacedBatchResponse> getUnplacedBatches() {
        return stockBatchRepository.findUnplacedBatches().stream()
                .map(this::toUnplacedResponse)
                .toList();
    }

    @Transactional
    public StorageLocationResponse createLocation(CreateStorageLocationRequest request) {
        String zone = request.getZone().trim().toUpperCase();
        String shelf = request.getShelf().trim();
        String bin = request.getBin().trim();
        String size = StorageLocationConstants.normalizeSize(request.getSize());

        if (!StorageLocationConstants.isValidSize(size)) {
            throw new AppException(ErrorCode.INVALID_STORAGE_LOCATION_SIZE);
        }

        if (storageLocationRepository.existsByStorageZone_CodeIgnoreCaseAndShelfAndBinAndIsRemovedFalse(
                zone, shelf, bin)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_SLOT_EXISTED);
        }

        String label = request.getLabel() == null || request.getLabel().isBlank()
                ? StorageLocationConstants.buildLabel(zone, shelf, bin)
                : request.getLabel().trim();

        if (storageLocationRepository.existsByLabelIgnoreCaseAndIsRemovedFalse(label)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_LABEL_EXISTED);
        }

        StorageZone zoneEntity = storageZoneService.ensureZoneExists(zone);
        if (storageZoneService.isReturnHoldZone(zoneEntity)) {
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

    @Transactional
    public StorageLocationResponse assignBatch(AssignBatchRequest request) {
        StockBatch batch = stockBatchRepository.findActiveWithProductById(request.getBatchId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));

        StorageLocation location = storageLocationRepository.findActiveWithContentsById(request.getLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        assertNotFull(location);

        int remaining = getUnplacedQuantity(batch);
        if (remaining <= 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
        }

        int quantity = request.getQuantity() != null ? request.getQuantity() : remaining;
        if (quantity < 1 || quantity > remaining) {
            throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
        }

        upsertBatchLocation(batch, location, quantity);

        StorageLocation refreshed = storageLocationRepository.findActiveWithContentsById(location.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        return toResponse(refreshed);
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

    @Transactional
    public void unassignBatch(UnassignBatchRequest request) {
        BatchLocation batchLocation = batchLocationRepository.findActiveWithDetailsById(request.getBatchLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));

        Integer locationId = batchLocation.getLocation().getId();
        batchLocation.setQuantity(0);
        batchLocation.setIsRemoved(true);
        batchLocationRepository.save(batchLocation);
        clearFullIfEmpty(locationId);
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

    private int getUnplacedQuantity(StockBatch batch) {
        int quantityIn = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        Integer placed = batchLocationRepository.sumQuantityByBatchId(batch.getId());
        int placedQty = placed != null ? placed : 0;
        return Math.max(0, quantityIn - placedQty);
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

        return StorageLocationResponse.builder()
                .id(location.getId())
                .label(location.getLabel())
                .zone(zoneCode)
                .zoneId(zone != null ? zone.getId() : null)
                .zoneTitle(zoneTitle)
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

    private UnplacedBatchResponse toUnplacedResponse(StockBatch batch) {
        Product product = batch.getProduct();
        return UnplacedBatchResponse.builder()
                .id(batch.getId())
                .batchId(batch.getId())
                .productId(product.getId())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode(StockBatchUtils.resolveBatchCode(batch))
                .quantity(getUnplacedQuantity(batch))
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
