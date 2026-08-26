package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.be_sep490_g67.dto.request.UpsertProductRequest;
import project.be_sep490_g67.dto.response.ProductDetailResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductCommandService {

    ProductRepository productRepository;
    CategoryRepository categoryRepository;
    ProductUnitRepository productUnitRepository;
    ProductAttributeRepository productAttributeRepository;
    AttributeRepository attributeRepository;
    ProductImageRepository productImageRepository;
    CloudinaryImageService cloudinaryImageService;
    SupplierRepository supplierRepository;

    @Transactional
    public ProductDetailResponse create(UpsertProductRequest request) {
        validateRequest(request, null);
        Category category = categoryRepository.findById(request.getCategoryId())
                .filter(c -> !Boolean.TRUE.equals(c.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        Product product = new Product();
        applyScalarFields(product, request, category);
        product = productRepository.save(product);

        if (product.getSku() == null || product.getSku().isBlank()) {
            product.setSku("SP" + String.format("%06d", product.getId()));
            product = productRepository.save(product);
        }

        replaceUnits(product, request.getUnits());
        replaceAttributes(product, request.getAttributes());

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            upsertChildVariants(product, request.getVariants(), category, request.getUnits());
        } else {
            createChildVariantsIfAny(product, request, category);
        }

        return toDetail(product.getId());
    }

    @Transactional(readOnly = true)
    public ProductDetailResponse getById(Integer id) {
        return toDetail(id);
    }

    @Transactional
    public ProductDetailResponse update(Integer id, UpsertProductRequest request) {
        Product product = productRepository.findByIdAndIsRemovedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));
        validateRequest(request, id);

        Category category = categoryRepository.findById(request.getCategoryId())
                .filter(c -> !Boolean.TRUE.equals(c.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        applyScalarFields(product, request, category);
        productRepository.save(product);

        productUnitRepository.deleteByProductId(id);
        productAttributeRepository.deleteByProductId(id);
        replaceUnits(product, request.getUnits());
        replaceAttributes(product, request.getAttributes());

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            upsertChildVariants(product, request.getVariants(), category, request.getUnits());
        }

        return toDetail(id);
    }

    @Transactional
    public ProductDetailResponse.ImageResponse uploadImage(Integer productId, MultipartFile file) {
        Product product = productRepository.findByIdAndIsRemovedFalse(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        CloudinaryImageService.UploadResult uploaded =
                cloudinaryImageService.upload(file, "sep490/products/" + productId);

        long count = productImageRepository.countByProductIdAndIsRemovedFalse(productId);
        boolean isMain = count == 0;

        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setUrl(uploaded.url());
        image.setPublicId(uploaded.publicId());
        image.setIsMain(isMain);
        image.setSortOrder((int) count);
        image = productImageRepository.save(image);

        if (isMain) {
            productRepository.save(product);
        }

        return ProductDetailResponse.ImageResponse.builder()
                .id(image.getId())
                .url(image.getUrl())
                .publicId(image.getPublicId())
                .isMain(Boolean.TRUE.equals(image.getIsMain()))
                .sortOrder(image.getSortOrder())
                .build();
    }

    @Transactional
    public void deleteImage(Integer productId, Integer imageId) {
        Product product = productRepository.findByIdAndIsRemovedFalse(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        ProductImage image = productImageRepository.findByIdAndProductIdAndIsRemovedFalse(imageId, productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_IMAGE_NOT_FOUND));

        cloudinaryImageService.delete(image.getPublicId());
        image.setIsRemoved(true);
        productImageRepository.save(image);

        if (Boolean.TRUE.equals(image.getIsMain())) {
            List<ProductImage> remain =
                    productImageRepository.findByProductIdAndIsRemovedFalseOrderBySortOrderAscIdAsc(productId);
            if (!remain.isEmpty()) {
                ProductImage next = remain.get(0);
                next.setIsMain(true);
                productImageRepository.save(next);
            }
            productRepository.save(product);
        }
    }

    private void applyScalarFields(Product product, UpsertProductRequest request, Category category) {
        String name = request.getName().trim();

        if (request.getParentId() != null) {
            Product parent = productRepository.findById(request.getParentId()).orElse(null);
            if (parent != null) {
                product.setParent(parent);
                // Format child name as ParentName-Attr1-Attr2 without appending unit of measure
                if (name.isBlank() || !name.contains("-")) {
                    String cleanParent = parent.getName().replaceAll("(?i)\\s*\\([^)]*\\)", "").trim();
                    StringBuilder sb = new StringBuilder(cleanParent);

                    if (request.getAttributes() != null && !request.getAttributes().isEmpty()) {
                        for (UpsertProductRequest.AttributeRequest a : request.getAttributes()) {
                            if (a.getValue() != null && !a.getValue().isBlank()) {
                                sb.append("-").append(a.getValue().trim());
                            }
                        }
                    }
                    name = sb.toString();
                }
            }
        }

        product.setName(name);
        product.setSku(blankToNull(request.getSku()));
        product.setBarcode(blankToNull(request.getBarcode()));
        product.setCategory(category);
        product.setDescription(request.getDescription());
        BigDecimal cost = nullToZero(request.getCostPrice());
        BigDecimal sell = nullToZero(request.getSellingPrice());
        String status = normalizeStatus(request.getStatus());

        product.setStatus(status);
        product.setCostPrice(cost);
        product.setSellingPrice(sell);
        product.setSeasonTag(blankToNull(request.getSeasonTag()));
        product.setIsRemoved(false);
    }

    private void replaceUnits(Product product, List<UpsertProductRequest.UnitRequest> units) {
        if (units == null || units.isEmpty()) {
            ProductUnit base = new ProductUnit();
            base.setProduct(product);
            base.setName("sp");
            base.setUnitBase(BigDecimal.ONE);
            base.setSellingPrice(product.getSellingPrice());
            productUnitRepository.save(base);
            return;
        }
        for (UpsertProductRequest.UnitRequest u : units) {
            ProductUnit unit = new ProductUnit();
            unit.setProduct(product);
            unit.setName(u.getName().trim());
            unit.setUnitBase(u.getUnitBase());
            unit.setSellingPrice(u.getSellingPrice() != null
                    ? u.getSellingPrice()
                    : derivePrice(product.getSellingPrice(), u.getUnitBase()));
            productUnitRepository.save(unit);
        }
    }

    /** Giá của một đơn vị quy đổi khi người dùng không nhập riêng: giá lẻ × hệ số. */
    private BigDecimal derivePrice(BigDecimal basePrice, BigDecimal unitBase) {
        BigDecimal price = nullToZero(basePrice);
        BigDecimal ratio = (unitBase == null || unitBase.signum() <= 0)
                ? BigDecimal.ONE
                : unitBase;
        return price.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    private void replaceAttributes(Product product, List<UpsertProductRequest.AttributeRequest> attrs) {
        if (attrs == null || attrs.isEmpty()) {
            return;
        }
        for (UpsertProductRequest.AttributeRequest a : attrs) {
            if (a.getName() == null || a.getName().isBlank() || a.getValue() == null || a.getValue().isBlank()) {
                throw new AppException(ErrorCode.PRODUCT_ATTRIBUTE_INVALID);
            }
            Attribute master = attributeRepository.findByNameIgnoreCaseAndIsRemovedFalse(a.getName().trim())
                    .orElseGet(() -> {
                        Attribute created = new Attribute();
                        created.setName(a.getName().trim());
                        created.setIsRemoved(false);
                        return attributeRepository.save(created);
                    });
            ProductAttribute pa = new ProductAttribute();
            pa.setProduct(product);
            pa.setAttribute(master);
            pa.setValue(a.getValue().trim());
            productAttributeRepository.save(pa);
        }
    }

    private ProductDetailResponse toDetail(Integer id) {
        Product product = productRepository.findDetailById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND));

        List<ProductUnit> units = productUnitRepository.findByProductIdAndIsRemovedFalse(id);
        List<ProductAttribute> attrs = productAttributeRepository.findByProductIdAndIsRemovedFalse(id);
        List<ProductImage> images =
                productImageRepository.findByProductIdAndIsRemovedFalseOrderBySortOrderAscIdAsc(id);

        String baseUnitName = units.stream()
                .filter(u -> u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                .map(ProductUnit::getName)
                .findFirst()
                .orElse(units.isEmpty() ? "sp" : units.get(0).getName());

        var category = product.getCategory();
        var defaultSupplier = category != null ? category.getDefaultSupplier() : null;
        String supplierName = null;
        if (defaultSupplier != null && !Boolean.TRUE.equals(defaultSupplier.getIsRemoved())) {
            supplierName = defaultSupplier.getName();
        } else if (category != null) {
            List<Supplier> linked = supplierRepository.findActiveByCategoryIds(List.of(category.getId()));
            if (linked != null && !linked.isEmpty()) {
                supplierName = linked.get(0).getName();
            }
        }

        String mainImgUrl = images.stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsMain()))
                .map(ProductImage::getUrl)
                .findFirst()
                .orElse(images.isEmpty() ? null : images.get(0).getUrl());

        if (mainImgUrl == null && product.getParent() != null) {
            Product parentObj = product.getParent();
            List<ProductImage> parentImages = productImageRepository.findByProductIdAndIsRemovedFalseOrderBySortOrderAscIdAsc(parentObj.getId());
            if (parentImages != null && !parentImages.isEmpty()) {
                mainImgUrl = parentImages.stream()
                        .filter(i -> Boolean.TRUE.equals(i.getIsMain()))
                        .map(ProductImage::getUrl)
                        .findFirst()
                        .orElse(parentImages.get(0).getUrl());
            }
        }

        List<Product> childProducts = productRepository.findByParent_IdAndIsRemovedFalse(id);
        List<ProductDetailResponse.VariantResponse> variantDTOs = childProducts.stream().map(cp -> {
            List<ProductAttribute> childAttrs = productAttributeRepository.findByProductIdAndIsRemovedFalse(cp.getId());
            return ProductDetailResponse.VariantResponse.builder()
                    .id(cp.getId())
                    .name(cp.getName())
                    .sku(cp.getSku())
                    .barcode(cp.getBarcode())
                    .costPrice(cp.getCostPrice())
                    .sellingPrice(cp.getSellingPrice())
                    .status(cp.getStatus())
                    .attributes(childAttrs.stream().map(ca -> ProductDetailResponse.AttributeResponse.builder()
                            .id(ca.getId())
                            .name(ca.getAttribute() != null ? ca.getAttribute().getName() : null)
                            .value(ca.getValue())
                            .build()).toList())
                    .build();
        }).toList();

        Product parent = product.getParent();
        return ProductDetailResponse.builder()
                .id(product.getId())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .name(product.getName())
                .sku(product.getSku())
                .barcode(product.getBarcode())
                .categoryId(category != null ? category.getId() : null)
                .categoryName(category != null ? category.getName() : null)
                .description(product.getDescription())
                .status(product.getStatus())
                .costPrice(product.getCostPrice())
                .sellingPrice(product.getSellingPrice())
                .seasonTag(product.getSeasonTag())
                .categoryCoverDays(category != null && category.getCoverDays() != null
                        ? category.getCoverDays()
                        : 7)
                .supplierName(supplierName)
                .productImg(mainImgUrl)
                .baseUnitName(baseUnitName)
                .units(units.stream().map(u -> ProductDetailResponse.UnitResponse.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .sellingPrice(u.getSellingPrice())
                        .isBase(u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                        .build()).toList())
                .attributes(attrs.stream().map(a -> ProductDetailResponse.AttributeResponse.builder()
                        .id(a.getId())
                        .name(a.getAttribute() != null ? a.getAttribute().getName() : null)
                        .value(a.getValue())
                        .build()).toList())
                .variants(variantDTOs)
                .images(images.stream().map(img -> ProductDetailResponse.ImageResponse.builder()
                        .id(img.getId())
                        .url(img.getUrl())
                        .publicId(img.getPublicId())
                        .isMain(Boolean.TRUE.equals(img.getIsMain()))
                        .sortOrder(img.getSortOrder())
                        .build()).toList())
                .build();
    }

    private void validateRequest(UpsertProductRequest request, Integer excludeId) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new AppException(ErrorCode.PRODUCT_NAME_REQUIRED);
        }
        if (request.getCategoryId() == null) {
            throw new AppException(ErrorCode.CATEGORY_NOT_FOUND);
        }

        BigDecimal cost = nullToZero(request.getCostPrice());
        BigDecimal sell = nullToZero(request.getSellingPrice());
        if (cost.compareTo(BigDecimal.ZERO) < 0 || sell.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.PRODUCT_PRICE_INVALID);
        }
        if (sell.compareTo(BigDecimal.ZERO) > 0 && sell.compareTo(cost) < 0) {
            throw new AppException(ErrorCode.PRODUCT_SELL_BELOW_COST);
        }

        BigDecimal vat = request.getVatPercent() == null ? new BigDecimal("10") : request.getVatPercent();
        if (vat.compareTo(BigDecimal.ZERO) < 0 || vat.compareTo(new BigDecimal("100")) > 0) {
            throw new AppException(ErrorCode.PRODUCT_VAT_INVALID);
        }

        String status = normalizeStatus(request.getStatus());
        if (!"active".equals(status) && !"inactive".equals(status) && !"new".equals(status)) {
            throw new AppException(ErrorCode.PRODUCT_STATUS_INVALID);
        }

        String sku = blankToNull(request.getSku());
        if (sku != null) {
            boolean exists = excludeId == null
                    ? productRepository.existsBySkuIgnoreCaseAndIsRemovedFalse(sku)
                    : productRepository.existsBySkuIgnoreCaseAndIdNotAndIsRemovedFalse(sku, excludeId);
            if (exists) {
                throw new AppException(ErrorCode.PRODUCT_SKU_EXISTED);
            }
        }

        String barcode = blankToNull(request.getBarcode());
        if (barcode != null) {
            boolean exists = excludeId == null
                    ? productRepository.existsByBarcodeAndIsRemovedFalse(barcode)
                    : productRepository.existsByBarcodeAndIdNotAndIsRemovedFalse(barcode, excludeId);
            if (exists) {
                throw new AppException(ErrorCode.PRODUCT_BARCODE_EXISTED);
            }
        }

        validateUnits(request.getUnits());
    }

    private void validateUnits(List<UpsertProductRequest.UnitRequest> units) {
        if (units == null || units.isEmpty()) {
            return;
        }
        long baseCount = units.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsBase())
                        || (u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0))
                .count();
        if (baseCount != 1) {
            throw new AppException(ErrorCode.PRODUCT_UNIT_BASE_INVALID);
        }

        Set<String> names = new HashSet<>();
        for (UpsertProductRequest.UnitRequest u : units) {
            if (u.getName() == null || u.getName().isBlank()
                    || u.getUnitBase() == null
                    || u.getUnitBase().compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(ErrorCode.PRODUCT_UNIT_INVALID);
            }
            String key = u.getName().trim().toLowerCase(Locale.ROOT);
            if (!names.add(key)) {
                throw new AppException(ErrorCode.PRODUCT_UNIT_INVALID);
            }
            if (Boolean.TRUE.equals(u.getIsBase()) && u.getUnitBase().compareTo(BigDecimal.ONE) != 0) {
                throw new AppException(ErrorCode.PRODUCT_UNIT_BASE_INVALID);
            }
        }
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "active";
        }
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private void createChildVariantsIfAny(Product parentProduct, UpsertProductRequest request, Category category) {
        if (request.getAttributes() == null || request.getAttributes().isEmpty()) {
            return;
        }

        Map<String, List<String>> groupedMap = new LinkedHashMap<>();
        for (UpsertProductRequest.AttributeRequest attr : request.getAttributes()) {
            if (attr.getName() != null && !attr.getName().isBlank()
                    && attr.getValue() != null && !attr.getValue().isBlank()) {
                String name = attr.getName().trim();
                String val = attr.getValue().trim();
                groupedMap.computeIfAbsent(name, k -> new ArrayList<>());
                if (!groupedMap.get(name).contains(val)) {
                    groupedMap.get(name).add(val);
                }
            }
        }

        if (groupedMap.isEmpty()) {
            return;
        }

        long totalCombinations = 1;
        for (List<String> values : groupedMap.values()) {
            totalCombinations *= values.size();
        }

        if (totalCombinations <= 1) {
            return;
        }

        List<List<UpsertProductRequest.AttributeRequest>> combinations = generateCombinations(groupedMap);

        for (List<UpsertProductRequest.AttributeRequest> combo : combinations) {
            Product child = new Product();
            child.setParent(parentProduct);
            child.setCategory(category);
            child.setCostPrice(parentProduct.getCostPrice());
            child.setSellingPrice(parentProduct.getSellingPrice());
            child.setDescription(parentProduct.getDescription());
            child.setSeasonTag(parentProduct.getSeasonTag());
            child.setStatus(parentProduct.getStatus());
            child.setIsRemoved(false);

            String variantSuffix = combo.stream()
                    .map(UpsertProductRequest.AttributeRequest::getValue)
                    .collect(Collectors.joining(" - "));

            String childName = parentProduct.getName() + " - " + variantSuffix;
            child.setName(childName);

            String skuClean = combo.stream()
                    .map(UpsertProductRequest.AttributeRequest::getValue)
                    .collect(Collectors.joining("-"))
                    .replaceAll("[^a-zA-Z0-9-]", "")
                    .toUpperCase();

            String parentSku = parentProduct.getSku() != null ? parentProduct.getSku() : "SP" + parentProduct.getId();
            String childSku = parentSku + "-" + skuClean;
            child.setSku(childSku);
            child.setBarcode(null);

            child = productRepository.save(child);

            replaceUnits(child, request.getUnits());
            replaceAttributes(child, combo);
        }
    }

    private List<List<UpsertProductRequest.AttributeRequest>> generateCombinations(Map<String, List<String>> groupedMap) {
        List<List<UpsertProductRequest.AttributeRequest>> result = new ArrayList<>();
        result.add(new ArrayList<>());

        for (Map.Entry<String, List<String>> entry : groupedMap.entrySet()) {
            String attrName = entry.getKey();
            List<String> attrValues = entry.getValue();

            List<List<UpsertProductRequest.AttributeRequest>> temp = new ArrayList<>();
            for (List<UpsertProductRequest.AttributeRequest> currentCombo : result) {
                for (String val : attrValues) {
                    List<UpsertProductRequest.AttributeRequest> newCombo = new ArrayList<>(currentCombo);
                    UpsertProductRequest.AttributeRequest attrReq = new UpsertProductRequest.AttributeRequest();
                    attrReq.setName(attrName);
                    attrReq.setValue(val);
                    newCombo.add(attrReq);
                    temp.add(newCombo);
                }
            }
            result = temp;
        }

        return result;
    }

    private void upsertChildVariants(Product parentProduct,
                                     List<UpsertProductRequest.VariantRequest> variantRequests,
                                     Category category,
                                     List<UpsertProductRequest.UnitRequest> parentUnits) {
        if (variantRequests == null || variantRequests.isEmpty()) {
            return;
        }

        List<Product> existingChildren = productRepository.findByParent_IdAndIsRemovedFalse(parentProduct.getId());
        Map<Integer, Product> existingMap = existingChildren.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        Set<Integer> keptIds = new HashSet<>();

        for (UpsertProductRequest.VariantRequest vr : variantRequests) {
            Product child;
            if (vr.getId() != null && existingMap.containsKey(vr.getId())) {
                child = existingMap.get(vr.getId());
            } else {
                child = new Product();
                child.setParent(parentProduct);
                child.setIsRemoved(false);
            }

            child.setCategory(category);
            child.setName(vr.getName() != null && !vr.getName().isBlank() ? vr.getName().trim() : parentProduct.getName());
            child.setBarcode(blankToNull(vr.getBarcode()));

            if (vr.getSku() != null && !vr.getSku().isBlank()) {
                child.setSku(vr.getSku().trim());
            } else if (child.getSku() == null || child.getSku().isBlank()) {
                String parentSku = parentProduct.getSku() != null ? parentProduct.getSku() : "SP" + parentProduct.getId();
                String slug = vr.getName() != null ? vr.getName().replaceAll("[^a-zA-Z0-9-]", "").toUpperCase() : String.valueOf(System.currentTimeMillis());
                child.setSku(parentSku + "-" + slug);
            }

            BigDecimal cost = nullToZero(vr.getCostPrice());
            BigDecimal sell = nullToZero(vr.getSellingPrice());
            if (cost.compareTo(BigDecimal.ZERO) == 0 && parentProduct.getCostPrice() != null) {
                cost = parentProduct.getCostPrice();
            }
            if (sell.compareTo(BigDecimal.ZERO) == 0 && parentProduct.getSellingPrice() != null) {
                sell = parentProduct.getSellingPrice();
            }

            child.setCostPrice(cost);
            child.setSellingPrice(sell);
            child.setStatus(vr.getStatus() != null ? vr.getStatus() : parentProduct.getStatus());
            child.setDescription(parentProduct.getDescription());
            child.setSeasonTag(parentProduct.getSeasonTag());

            child = productRepository.save(child);
            keptIds.add(child.getId());

            productUnitRepository.deleteByProductId(child.getId());
            productAttributeRepository.deleteByProductId(child.getId());
            replaceUnits(child, parentUnits);
            replaceAttributes(child, vr.getAttributes());
        }

        // Soft delete child variants that were removed in UI
        for (Product existing : existingChildren) {
            if (!keptIds.contains(existing.getId())) {
                existing.setIsRemoved(true);
                productRepository.save(existing);
            }
        }
    }
}
