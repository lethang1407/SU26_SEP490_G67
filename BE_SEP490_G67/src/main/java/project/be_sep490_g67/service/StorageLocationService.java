package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.StorageZoneConstants;
import project.be_sep490_g67.dto.request.AssignBatchRequest;
import project.be_sep490_g67.dto.request.CreateStorageLocationRequest;
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
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductUnitRepository;
import project.be_sep490_g67.repository.StockBatchRepository;
import project.be_sep490_g67.repository.StorageLocationRepository;

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
        String label = request.getLabel().trim();

        if (storageLocationRepository.existsByLabelIgnoreCaseAndIsRemovedFalse(label)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_LABEL_EXISTED);
        }

        StorageLocation location = new StorageLocation();
        location.setZone(request.getZone().trim().toUpperCase());
        location.setLabel(label);
        location.setAisle(trimToNull(request.getAisle()));
        location.setShelf(trimToNull(request.getShelf()));
        location.setBin(trimToNull(request.getBin()));
        location.setDescription(trimToNull(request.getDescription()));
        location.setIsActive(true);
        location.setIsRemoved(false);

        return toResponse(storageLocationRepository.save(location));
    }

    @Transactional
    public StorageLocationResponse assignBatch(AssignBatchRequest request) {
        StockBatch batch = stockBatchRepository.findActiveWithProductById(request.getBatchId())
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_BATCH_NOT_FOUND));

        StorageLocation location = storageLocationRepository.findActiveWithContentsById(request.getLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));

        int remaining = getUnplacedQuantity(batch);
        if (remaining <= 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
        }

        int quantity = request.getQuantity() != null ? request.getQuantity() : remaining;
        if (quantity < 1 || quantity > remaining) {
            throw new AppException(ErrorCode.INSUFFICIENT_UNPLACED_QUANTITY);
        }

        assertCanPlaceProduct(location, batch.getProduct().getId());
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

        int available = source.getQuantity() != null ? source.getQuantity() : 0;
        int quantity = request.getQuantity() != null ? request.getQuantity() : available;
        if (quantity < 1 || quantity > available) {
            throw new AppException(ErrorCode.INSUFFICIENT_BATCH_LOCATION_QUANTITY);
        }

        StockBatch batch = source.getBatch();
        assertCanPlaceProduct(destination, batch.getProduct().getId());

        int remainingOnSource = available - quantity;
        if (remainingOnSource <= 0) {
            source.setQuantity(0);
            source.setIsRemoved(true);
        } else {
            source.setQuantity(remainingOnSource);
        }
        batchLocationRepository.save(source);

        upsertBatchLocation(batch, destination, quantity);

        StorageLocation refreshed = storageLocationRepository.findActiveWithContentsById(destination.getId())
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_LOCATION_NOT_FOUND));
        return toResponse(refreshed);
    }

    @Transactional
    public void unassignBatch(UnassignBatchRequest request) {
        BatchLocation batchLocation = batchLocationRepository.findActiveWithDetailsById(request.getBatchLocationId())
                .orElseThrow(() -> new AppException(ErrorCode.BATCH_LOCATION_NOT_FOUND));

        batchLocation.setQuantity(0);
        batchLocation.setIsRemoved(true);
        batchLocationRepository.save(batchLocation);
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

    private void assertCanPlaceProduct(StorageLocation location, Integer productId) {
        Integer occupiedProductId = location.getBatchLocations().stream()
                .filter(bl -> !Boolean.TRUE.equals(bl.getIsRemoved()))
                .filter(bl -> bl.getQuantity() != null && bl.getQuantity() > 0)
                .map(bl -> bl.getBatch().getProduct().getId())
                .findFirst()
                .orElse(null);

        if (occupiedProductId != null && !Objects.equals(occupiedProductId, productId)) {
            throw new AppException(ErrorCode.STORAGE_LOCATION_PRODUCT_MISMATCH);
        }
    }

    private int getUnplacedQuantity(StockBatch batch) {
        int quantityIn = batch.getQuantityIn() != null ? batch.getQuantityIn() : 0;
        Integer placed = batchLocationRepository.sumQuantityByBatchId(batch.getId());
        int placedQty = placed != null ? placed : 0;
        return Math.max(0, quantityIn - placedQty);
    }

    private StorageLocationResponse toResponse(StorageLocation location) {
        return StorageLocationResponse.builder()
                .id(location.getId())
                .label(location.getLabel())
                .zone(location.getZone())
                .zoneTitle(StorageZoneConstants.resolveZoneTitle(location.getZone()))
                .aisle(location.getAisle())
                .shelf(location.getShelf())
                .bin(location.getBin())
                .description(location.getDescription())
                .contents(mapContents(location))
                .build();
    }

    private List<StorageLocationContentResponse> mapContents(StorageLocation location) {
        List<BatchLocation> activeLocations = location.getBatchLocations().stream()
                .filter(batchLocation -> !Boolean.TRUE.equals(batchLocation.getIsRemoved()))
                .filter(batchLocation -> batchLocation.getQuantity() != null && batchLocation.getQuantity() > 0)
                .sorted(Comparator.comparing(BatchLocation::getId))
                .toList();

        if (activeLocations.isEmpty()) {
            return List.of();
        }

        Integer primaryProductId = activeLocations.get(0).getBatch().getProduct().getId();

        return activeLocations.stream()
                .filter(batchLocation ->
                        Objects.equals(batchLocation.getBatch().getProduct().getId(), primaryProductId))
                .map(this::toContentResponse)
                .toList();
    }

    private StorageLocationContentResponse toContentResponse(BatchLocation batchLocation) {
        StockBatch batch = batchLocation.getBatch();
        Product product = batch.getProduct();

        return StorageLocationContentResponse.builder()
                .id(batchLocation.getId())
                .batchId(batch.getId())
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode("BATCH-" + batch.getId())
                .quantity(batchLocation.getQuantity())
                .importPrice(batch.getCostPerUnit() != null ? batch.getCostPerUnit() : product.getCostPrice())
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .build();
    }

    private UnplacedBatchResponse toUnplacedResponse(StockBatch batch) {
        Product product = batch.getProduct();
        return UnplacedBatchResponse.builder()
                .id(batch.getId())
                .batchId(batch.getId())
                .productCode(resolveProductCode(product))
                .productName(product.getName())
                .unit(resolveBaseUnitName(product.getId()))
                .batchCode("BATCH-" + batch.getId())
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
