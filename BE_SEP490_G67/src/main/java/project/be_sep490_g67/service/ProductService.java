package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.constants.ProductConstants;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.mapper.ProductMapper;
import project.be_sep490_g67.repository.*;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.dto.response.ProductSearchResponse;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.util.StockBatchUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductService {

    ProductRepository productRepository;
    ProductUnitRepository productUnitRepository;
    ProductAttributeRepository productAttributeRepository;
    AttributeRepository attributeRepository;
    CategoryRepository categoryRepository;
    UserRepository userRepository;
    StockBatchRepository stockBatchRepository;
    BatchLocationRepository batchLocationRepository;
    ProductMapper productMapper;
    ImportOrderDetailRepository importOrderDetailRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductListResponse> getProductList(
            String keyword,
            String category,
            String status,
            int page,
            int size) {
        List<Product> products = productRepository.findAllActive();
        Map<Integer, Integer> stockMap = loadStockMap(products);

        List<ProductListResponse> filtered = products.stream()
                .filter(product -> matchesKeyword(product, keyword))
                .filter(product -> matchesCategory(product, category))
                .map(product -> productMapper.toListResponse(
                        product,
                        stockMap.getOrDefault(product.getId(), 0)))
                .filter(item -> matchesStockStatus(item.getStock(), status))
                .toList();

        return paginate(filtered, page, size);
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getProductById(Integer productId) {
        Product product = findActiveProduct(productId);
        int stock = loadStock(product.getId());
        List<ProductUnit> units = productUnitRepository
                .findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(product.getId());
        List<ProductAttribute> attributes = productAttributeRepository
                .findByProduct_IdAndIsRemovedFalse(product.getId());

        return productMapper.toDetailResponse(product, stock, units, attributes);
    }

    @Transactional
    public ProductDetailResponse createProduct(CreateProductRequest request, String actorUsername) {
        Category category = resolveCategory(request.getCategory());
        String barcode = normalizeBarcode(request.getBarcode());
        validateBarcodeUnique(barcode, null);

        BigDecimal costPrice = parsePrice(request.getImportPrice());
        BigDecimal sellingPrice = parsePrice(request.getSellPrice());
        Integer actorId = resolveActorId(actorUsername);

        Product product = new Product();
        product.setName(request.getName().trim());
        product.setBarcode(barcode);
        product.setCategory(category);
        product.setDescription(trimToNull(request.getDescription()));
        product.setCostPrice(costPrice);
        product.setSellingPrice(sellingPrice);
        product.setMinStock(0);
        product.setIsRemoved(false);
        product.setCreatedAt(Instant.now());
        product.setUpdatedAt(Instant.now());
        product.setCreatedBy(actorId);
        product.setUpdatedBy(actorId);

        Product savedProduct = productRepository.save(product);
        createBaseUnit(savedProduct, ProductConstants.DEFAULT_BASE_UNIT_NAME, actorId);
        syncAttributes(savedProduct, request.getAttributes(), actorId);

        log.info("Created product with id={}", savedProduct.getId());
        return getProductById(savedProduct.getId());
    }

    @Transactional
    public ProductDetailResponse updateProduct(
            Integer productId,
            UpdateProductRequest request,
            String actorUsername) {
        Product product = findActiveProduct(productId);
        Integer actorId = resolveActorId(actorUsername);

        if (request.getName() != null && !request.getName().isBlank()) {
            product.setName(request.getName().trim());
        }

        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            product.setCategory(resolveCategory(request.getCategory()));
        }

        if (request.getDescription() != null) {
            product.setDescription(trimToNull(request.getDescription()));
        }

        if (request.getImportPrice() != null) {
            product.setCostPrice(validatePrice(request.getImportPrice()));
        }

        if (request.getSellPrice() != null) {
            product.setSellingPrice(validatePrice(request.getSellPrice()));
        } else if (request.getBaseUnit() != null && request.getBaseUnit().getSellPrice() != null) {
            product.setSellingPrice(validatePrice(request.getBaseUnit().getSellPrice()));
        }

        syncUnits(product, request, actorId);

        if (request.getBrand() != null) {
            syncBrandAttribute(product, request.getBrand(), actorId);
        }

        product.setUpdatedAt(Instant.now());
        product.setUpdatedBy(actorId);
        productRepository.save(product);

        log.info("Updated product with id={}", productId);
        return getProductById(productId);
    }

    @Transactional(readOnly = true)
    public ProductBarcodeResponse getProductByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với mã vạch: " + barcode));

        List<ProductBarcodeResponse.ProductUnitInfo> unitInfos = productUnitRepository
                .findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(product.getId())
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
                        .batchCode(StockBatchUtils.resolveBatchCode(b))
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

    private Product findActiveProduct(Integer productId) {
        return productRepository.findActiveById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
    }

    private Category resolveCategory(String categoryName) {
        return categoryRepository.findActiveByNameIgnoreCase(categoryName.trim())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_CATEGORY));
    }

    private Integer resolveActorId(String actorUsername) {
        return userRepository.findIdByUsername(actorUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void validateBarcodeUnique(String barcode, Integer productId) {
        if (barcode == null || barcode.isBlank()) {
            return;
        }

        boolean exists = productId == null
                ? productRepository.existsByBarcodeAndIsRemovedFalse(barcode)
                : productRepository.existsByBarcodeAndIdNotAndIsRemovedFalse(barcode, productId);

        if (exists) {
            throw new AppException(ErrorCode.BARCODE_EXISTED);
        }
    }

    private String normalizeBarcode(String barcode) {
        if (barcode == null) {
            return null;
        }
        String normalized = barcode.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private BigDecimal parsePrice(String rawPrice) {
        if (rawPrice == null || rawPrice.isBlank()) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_PRICE);
        }

        try {
            return validatePrice(new BigDecimal(rawPrice.trim()));
        } catch (NumberFormatException exception) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_PRICE);
        }
    }

    private BigDecimal validatePrice(BigDecimal price) {
        if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_PRICE);
        }
        return price;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void createBaseUnit(Product product, String unitName, Integer actorId) {
        ProductUnit unit = new ProductUnit();
        unit.setProduct(product);
        unit.setName(unitName);
        unit.setUnitBase(BigDecimal.ONE);
        unit.setIsRemoved(false);
        unit.setCreatedAt(Instant.now());
        unit.setUpdatedAt(Instant.now());
        unit.setCreatedBy(actorId);
        unit.setUpdatedBy(actorId);
        productUnitRepository.save(unit);
    }

    private void syncAttributes(
            Product product,
            List<ProductAttributeRequest> attributeRequests,
            Integer actorId) {
        if (attributeRequests == null || attributeRequests.isEmpty()) {
            return;
        }

        for (ProductAttributeRequest attributeRequest : attributeRequests) {
            if (attributeRequest.getName() == null || attributeRequest.getName().isBlank()) {
                continue;
            }

            upsertProductAttribute(
                    product,
                    attributeRequest.getName().trim(),
                    trimToNull(attributeRequest.getValue()),
                    actorId);
        }
    }

    private void syncBrandAttribute(Product product, String brand, Integer actorId) {
        upsertProductAttribute(product, "Thương hiệu", trimToNull(brand), actorId);
    }

    private void upsertProductAttribute(
            Product product,
            String attributeName,
            String value,
            Integer actorId) {
        List<ProductAttribute> existingAttributes = productAttributeRepository
                .findByProduct_IdAndIsRemovedFalse(product.getId());

        ProductAttribute existingAttribute = existingAttributes.stream()
                .filter(item -> item.getAttribute() != null
                        && attributeName.equalsIgnoreCase(item.getAttribute().getName()))
                .findFirst()
                .orElse(null);

        if (value == null) {
            if (existingAttribute != null) {
                existingAttribute.setIsRemoved(true);
                existingAttribute.setUpdatedAt(Instant.now());
                existingAttribute.setUpdatedBy(actorId);
                productAttributeRepository.save(existingAttribute);
            }
            return;
        }

        Attribute attribute = attributeRepository
                .findByNameIgnoreCaseAndIsRemovedFalse(attributeName)
                .orElseGet(() -> {
                    Attribute newAttribute = new Attribute();
                    newAttribute.setName(attributeName);
                    newAttribute.setIsRemoved(false);
                    newAttribute.setCreatedAt(Instant.now());
                    newAttribute.setUpdatedAt(Instant.now());
                    newAttribute.setCreatedBy(actorId);
                    newAttribute.setUpdatedBy(actorId);
                    return attributeRepository.save(newAttribute);
                });

        if (existingAttribute != null) {
            existingAttribute.setValue(value);
            existingAttribute.setUpdatedAt(Instant.now());
            existingAttribute.setUpdatedBy(actorId);
            productAttributeRepository.save(existingAttribute);
            return;
        }

        ProductAttribute productAttribute = new ProductAttribute();
        productAttribute.setProduct(product);
        productAttribute.setAttribute(attribute);
        productAttribute.setValue(value);
        productAttribute.setIsRemoved(false);
        productAttribute.setCreatedAt(Instant.now());
        productAttribute.setUpdatedAt(Instant.now());
        productAttribute.setCreatedBy(actorId);
        productAttribute.setUpdatedBy(actorId);
        productAttributeRepository.save(productAttribute);
    }

    private void syncUnits(Product product, UpdateProductRequest request, Integer actorId) {
        List<ProductUnit> existingUnits = productUnitRepository
                .findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(product.getId());

        ProductUnit baseUnit = existingUnits.stream()
                .filter(unit -> unit.getUnitBase() != null
                        && unit.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                .findFirst()
                .orElse(null);

        String baseUnitName = request.getBaseUnit() != null && request.getBaseUnit().getName() != null
                ? request.getBaseUnit().getName().trim()
                : ProductConstants.DEFAULT_BASE_UNIT_NAME;

        if (baseUnit == null) {
            createBaseUnit(product, baseUnitName, actorId);
        } else {
            baseUnit.setName(baseUnitName);
            baseUnit.setUpdatedAt(Instant.now());
            baseUnit.setUpdatedBy(actorId);
            productUnitRepository.save(baseUnit);
        }

        Set<Integer> retainedConversionUnitIds = new HashSet<>();
        List<ProductConversionUnitRequest> conversionUnits = request.getConversionUnits() == null ? List.of()
                : request.getConversionUnits();

        for (ProductConversionUnitRequest conversionUnitRequest : conversionUnits) {
            if (conversionUnitRequest.getName() == null || conversionUnitRequest.getName().isBlank()) {
                continue;
            }

            BigDecimal ratio = conversionUnitRequest.getRatio() != null
                    ? conversionUnitRequest.getRatio()
                    : BigDecimal.ONE;

            if (ratio.compareTo(BigDecimal.ONE) <= 0) {
                continue;
            }

            ProductUnit unit = resolveExistingConversionUnit(existingUnits, conversionUnitRequest.getId());
            if (unit == null) {
                unit = new ProductUnit();
                unit.setProduct(product);
                unit.setIsRemoved(false);
                unit.setCreatedAt(Instant.now());
                unit.setCreatedBy(actorId);
            }

            unit.setName(conversionUnitRequest.getName().trim());
            unit.setUnitBase(ratio);
            unit.setUpdatedAt(Instant.now());
            unit.setUpdatedBy(actorId);
            ProductUnit savedUnit = productUnitRepository.save(unit);
            retainedConversionUnitIds.add(savedUnit.getId());
        }

        for (ProductUnit unit : existingUnits) {
            if (unit.getUnitBase() != null
                    && unit.getUnitBase().compareTo(BigDecimal.ONE) != 0
                    && !retainedConversionUnitIds.contains(unit.getId())) {
                unit.setIsRemoved(true);
                unit.setUpdatedAt(Instant.now());
                unit.setUpdatedBy(actorId);
                productUnitRepository.save(unit);
            }
        }
    }

    private ProductUnit resolveExistingConversionUnit(List<ProductUnit> existingUnits, String rawId) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }

        try {
            Integer unitId = Integer.valueOf(rawId);
            return existingUnits.stream()
                    .filter(unit -> unitId.equals(unit.getId()))
                    .findFirst()
                    .orElse(null);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Map<Integer, Integer> loadStockMap(List<Product> products) {
        if (products.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Integer> productIds = products.stream().map(Product::getId).toList();
        return productMapper.toStockMap(stockBatchRepository.sumStockByProductIds(productIds));
    }

    private int loadStock(Integer productId) {
        return productMapper.toStockMap(stockBatchRepository.sumStockByProductIds(List.of(productId)))
                .getOrDefault(productId, 0);
    }

    private boolean matchesKeyword(Product product, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }

        String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String productCode = ProductConstants.formatProductCode(product.getId()).toLowerCase(Locale.ROOT);

        return (product.getName() != null
                && product.getName().toLowerCase(Locale.ROOT).contains(normalizedKeyword))
                || (product.getBarcode() != null && product.getBarcode().contains(normalizedKeyword))
                || productCode.contains(normalizedKeyword);
    }

    private boolean matchesCategory(Product product, String categoryName) {
        if (categoryName == null || categoryName.isBlank() || "all".equalsIgnoreCase(categoryName.trim())) {
            return true;
        }

        return product.getCategory() != null
                && categoryName.equalsIgnoreCase(product.getCategory().getName());
    }

    private boolean matchesStockStatus(Integer stock, String status) {
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status.trim())) {
            return true;
        }

        boolean inStock = stock != null && stock > 0;

        if (ProductConstants.STATUS_FILTER_IN_STOCK.equalsIgnoreCase(status)) {
            return inStock;
        }

        if (ProductConstants.STATUS_FILTER_OUT_OF_STOCK.equalsIgnoreCase(status)) {
            return !inStock;
        }

        return true;
    }

    private PageResponse<ProductListResponse> paginate(List<ProductListResponse> items, int page, int size) {
        int safeSize = size <= 0 ? 10 : size;
        int totalElements = items.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        int safePage = Math.min(Math.max(page, 0), Math.max(totalPages - 1, 0));
        int fromIndex = safePage * safeSize;
        int toIndex = Math.min(fromIndex + safeSize, totalElements);

        List<ProductListResponse> content = fromIndex >= totalElements
                ? List.of()
                : items.subList(fromIndex, toIndex);

        return PageResponse.<ProductListResponse>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
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
                        ? BigDecimal.ZERO
                        : u.getUnitBase()))
                .map(u -> ProductPosInfoResponse.UnitInfo.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .build())
                .toList();

        // Đã sắp xếp sẵn ở query: khu bán trước, rồi FIFO theo ngày nhập (null xuống
        // cuối).
        List<ProductPosInfoResponse.LocationStockInfo> locationInfos = batchLocationRepository
                .findPosLinesByProductId(productId).stream()
                .map(ProductService::toLocationStockInfo)
                .toList();

        int salesZoneQty = locationInfos.stream()
                .filter(l -> SALES_ZONE_TYPE.equals(l.getZoneType()))
                .mapToInt(ProductPosInfoResponse.LocationStockInfo::getQuantity)
                .sum();
        int available = locationInfos.stream()
                .mapToInt(ProductPosInfoResponse.LocationStockInfo::getQuantity)
                .sum();

        // Dòng khu bán đầu tiên là ô POS chọn sẵn; không có nghĩa là SP chưa ra quầy.
        ProductPosInfoResponse.LocationStockInfo defaultLine = locationInfos.stream()
                .filter(l -> SALES_ZONE_TYPE.equals(l.getZoneType()))
                .findFirst()
                .orElse(null);

        return ProductPosInfoResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .barcode(product.getBarcode())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .description(product.getDescription())
                .sellingPrice(product.getSellingPrice())
                .availableQuantity(available)
                .salesZoneQuantity(salesZoneQty)
                .warehouseQuantity(available - salesZoneQty)
                .minStock(product.getMinStock())
                .belowMinStock(product.getMinStock() != null && available <= product.getMinStock())
                .defaultLocationId(defaultLine != null ? defaultLine.getLocationId() : null)
                .defaultBatchId(defaultLine != null ? defaultLine.getBatchId() : null)
                .units(unitInfos)
                .locations(locationInfos)
                .build();
    }

    private static final String SALES_ZONE_TYPE = "SALES";

    private static ProductPosInfoResponse.LocationStockInfo toLocationStockInfo(BatchLocation bl) {
        StorageLocation location = bl.getLocation();
        StockBatch batch = bl.getBatch();
        StorageZone zone = location.getStorageZone();
        return ProductPosInfoResponse.LocationStockInfo.builder()
                .locationId(location.getId())
                .label(describeLocation(location))
                .zoneCode(location.getZoneCode())
                .zoneType(zone != null ? zone.getZoneType() : null)
                .locationFull(Boolean.TRUE.equals(location.getIsFull()))
                .batchId(batch.getId())
                .batchCode(StockBatchUtils.resolveBatchCode(batch))
                .receivedDate(batch.getReceivedDate() != null ? batch.getReceivedDate().toString() : null)
                .expiryDate(batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null)
                .quantity(bl.getQuantity() != null ? bl.getQuantity() : 0)
                .build();
    }

    private static String describeLocation(StorageLocation location) {
        if (location.getLabel() != null && !location.getLabel().isBlank()) {
            return location.getLabel();
        }
        String composed = Stream.of(location.getZoneCode(), location.getAisle(),
                location.getShelf(), location.getBin())
                .filter(part -> part != null && !part.isBlank())
                .reduce((a, b) -> a + " - " + b)
                .orElse("");
        return composed.isBlank() ? "Chưa gán vị trí" : composed;
    }

    @Transactional(readOnly = true)
    public List<ProductSearchResponse> searchByNameAndBarcode(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        List<Product> productList = productRepository.searchSellableByNameAndBarcode(query.trim())
                .stream()
                .filter(p -> !Boolean.TRUE.equals(p.getIsRemoved()))
                .limit(20)
                .toList();

        if (productList.isEmpty()) {
            return List.of();
        }

        List<Integer> productIds = productList.stream().map(Product::getId).toList();
        Map<Integer, List<ProductAttribute>> attributesByProduct = productAttributeRepository
                .findByProduct_IdInAndIsRemovedFalse(productIds)
                .stream()
                .collect(Collectors.groupingBy(item -> item.getProduct().getId()));

        return productList.stream()
                .map(product -> toSearchResponse(
                        product,
                        attributesByProduct.getOrDefault(product.getId(), List.of())))
                .toList();
    }

    private ProductSearchResponse toSearchResponse(Product product, List<ProductAttribute> attributes) {
        BigDecimal costPrice = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
        BigDecimal lastCostPerBase = stockBatchRepository
                .findFirstByProduct_IdAndIsRemovedFalseOrderByReceivedDateDescIdDesc(product.getId())
                .map(StockBatch::getCostPerUnit)
                .filter(cost -> cost != null)
                .orElse(costPrice);
        int stockQuantity = loadStock(product.getId());
        Product parent = product.getParent();

        List<ProductSearchResponse.ProductUnitInfo> unitInfos = productUnitRepository
                .findByProduct_IdAndIsRemovedFalseOrderByUnitBaseAsc(product.getId())
                .stream()
                .map(u -> ProductSearchResponse.ProductUnitInfo.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .build())
                .toList();

        return ProductSearchResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .sku(product.getSku())
                .barcode(product.getBarcode())
                .sellingPrice(product.getSellingPrice())
                .costPrice(costPrice)
                .lastCostPerBase(lastCostPerBase)
                .stockQuantity(stockQuantity)
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .attributes(productMapper.toAttributeResponses(attributes))
                .productUnits(unitInfos)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PriceHistoryResponse> getPriceHistory(Integer productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm");
        }
        List<ImportOrderDetail> details = importOrderDetailRepository.findPriceHistoryFromImportOrders(productId);
        return details.stream()
                .map(d -> PriceHistoryResponse.builder()
                        .id(d.getId())
                        .price(d.getCostPerUnit())
                        .supplierId(d.getImportOrder() != null && d.getImportOrder().getSupplier() != null ? d.getImportOrder().getSupplier().getId() : null)
                        .supplierName(d.getImportOrder() != null && d.getImportOrder().getSupplier() != null ? d.getImportOrder().getSupplier().getName() : null)
                        .createdAt(d.getImportOrder() != null && d.getImportOrder().getCreatedAt() != null ? d.getImportOrder().getCreatedAt() : d.getCreatedAt())
                        .build())
                .toList();
    }
}
