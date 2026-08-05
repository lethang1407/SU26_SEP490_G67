package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.dto.response.ProductPosInfoResponse;
import project.be_sep490_g67.dto.response.ProductSearchResponse;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.StockBatchRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductService {

    ProductRepository productRepository;
    StockBatchRepository stockBatchRepository;
    BatchLocationRepository batchLocationRepository;

    @Transactional(readOnly = true)
    public ProductBarcodeResponse getProductByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với mã vạch: " + barcode));

        // Map product units — only non-removed units
        List<ProductBarcodeResponse.ProductUnitInfo> unitInfos = product.getProductUnits()
                .stream()
                .filter(u -> Boolean.FALSE.equals(u.getIsRemoved()))
                .map(u -> ProductBarcodeResponse.ProductUnitInfo.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .build())
                .toList();

        // Fetch available stock batches
        List<StockBatch> batches = stockBatchRepository.findAvailableByProductId(product.getId());
        List<ProductBarcodeResponse.StockBatchInfo> batchInfos = batches.stream()
                .map(b -> ProductBarcodeResponse.StockBatchInfo.builder()
                        .id(b.getId())
                        .batchCode("BATCH-" + b.getId())
                        .quantity(b.getQuantityIn())
                        .expiryDate(b.getExpiryDate() != null ? b.getExpiryDate().toString()
                                : null)
                        .build())
                .toList();

        return ProductBarcodeResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .barcode(product.getBarcode())
                .sellingPrice(product.getSellingPrice())
                .productUnits(unitInfos)
                .stockBatches(batchInfos)
                .build();
    }

    @Transactional(readOnly = true)
    public ProductPosInfoResponse getPosInfo(Integer productId) {
        Product product = productRepository.findById(productId)
                .filter(p -> Boolean.FALSE.equals(p.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        List<ProductPosInfoResponse.UnitInfo> unitInfos = product.getProductUnits().stream()
                .filter(u -> Boolean.FALSE.equals(u.getIsRemoved()))
                .sorted(Comparator.comparing(u -> u.getUnitBase() == null
                        ? BigDecimal.ZERO : u.getUnitBase()))
                .map(u -> ProductPosInfoResponse.UnitInfo.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .build())
                .toList();

        Map<Integer, LocationAccumulator> byLocation = new LinkedHashMap<>();
        for (BatchLocation bl : batchLocationRepository.findAvailableByProductId(productId)) {
            StorageLocation location = bl.getLocation();
            LocationAccumulator acc = byLocation.computeIfAbsent(
                    location.getId(), id -> new LocationAccumulator(location));
            acc.add(bl.getQuantity(), bl.getBatch().getExpiryDate());
        }

        List<ProductPosInfoResponse.LocationStockInfo> locationInfos = byLocation.values().stream()
                .sorted(Comparator.comparing(LocationAccumulator::quantity).reversed())
                .map(LocationAccumulator::toResponse)
                .toList();

        int available = locationInfos.stream()
                .mapToInt(ProductPosInfoResponse.LocationStockInfo::getQuantity)
                .sum();

        return ProductPosInfoResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .barcode(product.getBarcode())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .description(product.getDescription())
                .sellingPrice(product.getSellingPrice())
                .availableQuantity(available)
                .minStock(product.getMinStock())
                .belowMinStock(product.getMinStock() != null && available <= product.getMinStock())
                .units(unitInfos)
                .locations(locationInfos)
                .build();
    }

    private static final class LocationAccumulator {
        private final StorageLocation location;
        private int quantity;
        private LocalDate nearestExpiry;

        private LocationAccumulator(StorageLocation location) {
            this.location = location;
        }

        private void add(Integer qty, LocalDate expiryDate) {
            quantity += qty == null ? 0 : qty;
            if (expiryDate != null && (nearestExpiry == null || expiryDate.isBefore(nearestExpiry))) {
                nearestExpiry = expiryDate;
            }
        }

        private int quantity() {
            return quantity;
        }

        private ProductPosInfoResponse.LocationStockInfo toResponse() {
            return ProductPosInfoResponse.LocationStockInfo.builder()
                    .locationId(location.getId())
                    .label(describe(location))
                    .quantity(quantity)
                    .nearestExpiryDate(nearestExpiry != null ? nearestExpiry.toString() : null)
                    .build();
        }

        private static String describe(StorageLocation location) {
            if (location.getLabel() != null && !location.getLabel().isBlank()) {
                return location.getLabel();
            }
            String composed = Stream.of(location.getZone(), location.getAisle(),
                            location.getShelf(), location.getBin())
                    .filter(part -> part != null && !part.isBlank())
                    .reduce((a, b) -> a + " - " + b)
                    .orElse("");
            return composed.isBlank() ? "Chưa gán vị trí" : composed;
        }
    }

    @Transactional(readOnly = true)
    public List<ProductSearchResponse> searchByNameAndBarcode(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        List<Product> productList = productRepository.searchByNameAndBarcode(query.trim());
        return productList.stream()
                .filter(p -> Boolean.FALSE.equals(p.getIsRemoved())) // loại sp đã deactivate
                .limit(20)
                .map(product -> ProductSearchResponse.builder()
                        .id(product.getId())
                        .name(product.getName())
                        .barcode(product.getBarcode())
                        .sellingPrice(product.getSellingPrice())
                        .productUnits(product.getProductUnits().stream()
                                .filter(u -> Boolean.FALSE.equals(u.getIsRemoved()))
                                .map(u -> ProductSearchResponse.ProductUnitInfo
                                        .builder()
                                        .id(u.getId())
                                        .name(u.getName())
                                        .unitBase(u.getUnitBase())
                                        .build())
                                .toList())
                        .build())
                .toList();

    }
}
