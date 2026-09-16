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
import java.time.Instant;
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
            product.setSku(generateUniqueSku(product.getId()));
            product = productRepository.save(product);
        }

        mergeUnits(product, request.getUnits());
        mergeAttributes(product, request.getAttributes());

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

        mergeUnits(product, request.getUnits());
        mergeAttributes(product, request.getAttributes());

        // Nếu đây là sản phẩm Cha (parent == null): Đồng bộ danh mục, trạng thái và cập nhật variants
        if (product.getParent() == null) {
            // Đồng bộ Category & Trạng thái inactive xuống các biến thể con hiện có
            List<Product> existingChildren = productRepository.findByParent_IdAndIsRemovedFalse(product.getId());
            for (Product child : existingChildren) {
                child.setCategory(category);
                if ("inactive".equalsIgnoreCase(product.getStatus())) {
                    child.setStatus("inactive");
                }
                productRepository.save(child);
            }

            // Luôn gọi upsertChildVariants để đồng bộ (nếu request.getVariants() rỗng thì soft-delete biến thể cũ)
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
                // Chỉ tự động ghép tên nếu người dùng không truyền tên cụ thể
                if (name.isBlank()) {
                    String cleanParent = parent.getName().replaceAll("(?i)\\s*\\([^)]*\\)", "").trim();
                    StringBuilder sb = new StringBuilder(cleanParent);

                    if (request.getAttributes() != null && !request.getAttributes().isEmpty()) {
                        for (UpsertProductRequest.AttributeRequest a : request.getAttributes()) {
                            if (a.getValue() != null && !a.getValue().isBlank()) {
                                sb.append(" - ").append(a.getValue().trim());
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
        if (product.getCreatedAt() == null) {
            product.setCreatedAt(Instant.now());
        }
        product.setUpdatedAt(Instant.now());
    }

    private void mergeUnits(Product product, List<UpsertProductRequest.UnitRequest> units) {
        List<ProductUnit> existingUnits = (product.getId() != null)
                ? productUnitRepository.findByProductIdAndIsRemovedFalse(product.getId())
                : new ArrayList<>();

        if (units == null || units.isEmpty()) {
            if (existingUnits.isEmpty()) {
                ProductUnit base = new ProductUnit();
                base.setProduct(product);
                base.setName("sp");
                base.setUnitBase(BigDecimal.ONE);
                base.setSellingPrice(product.getSellingPrice());
                base.setIsRemoved(false);
                productUnitRepository.save(base);
            } else {
                boolean keptBase = false;
                for (ProductUnit u : existingUnits) {
                    if (!keptBase && (u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)) {
                        u.setSellingPrice(product.getSellingPrice());
                        u.setIsRemoved(false);
                        productUnitRepository.save(u);
                        keptBase = true;
                    } else {
                        u.setIsRemoved(true);
                        productUnitRepository.save(u);
                    }
                }
                if (!keptBase) {
                    ProductUnit first = existingUnits.get(0);
                    first.setIsRemoved(false);
                    first.setUnitBase(BigDecimal.ONE);
                    first.setSellingPrice(product.getSellingPrice());
                    productUnitRepository.save(first);
                }
            }
            return;
        }

        Map<Integer, ProductUnit> existingById = existingUnits.stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(ProductUnit::getId, Function.identity(), (a, b) -> a));

        Map<String, ProductUnit> existingByName = existingUnits.stream()
                .filter(u -> u.getName() != null)
                .collect(Collectors.toMap(u -> u.getName().trim().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));

        Set<Integer> keptUnitIds = new HashSet<>();

        for (UpsertProductRequest.UnitRequest u : units) {
            ProductUnit target = null;
            if (u.getId() != null && existingById.containsKey(u.getId())) {
                target = existingById.get(u.getId());
            } else if (u.getName() != null && existingByName.containsKey(u.getName().trim().toLowerCase(Locale.ROOT))) {
                target = existingByName.get(u.getName().trim().toLowerCase(Locale.ROOT));
            }

            if (target == null) {
                target = new ProductUnit();
                target.setProduct(product);
            }

            target.setName(u.getName().trim());
            target.setUnitBase(u.getUnitBase());
            target.setSellingPrice(u.getSellingPrice() != null
                    ? u.getSellingPrice()
                    : derivePrice(product.getSellingPrice(), u.getUnitBase()));
            target.setIsRemoved(false);
            target = productUnitRepository.save(target);
            keptUnitIds.add(target.getId());
        }

        for (ProductUnit existing : existingUnits) {
            if (!keptUnitIds.contains(existing.getId())) {
                existing.setIsRemoved(true);
                productUnitRepository.save(existing);
            }
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

    private void mergeAttributes(Product product, List<UpsertProductRequest.AttributeRequest> attrs) {
        List<ProductAttribute> existingAttrs = (product.getId() != null)
                ? productAttributeRepository.findByProduct_IdAndIsRemovedFalse(product.getId())
                : new ArrayList<>();

        if (attrs == null || attrs.isEmpty()) {
            for (ProductAttribute pa : existingAttrs) {
                pa.setIsRemoved(true);
                productAttributeRepository.save(pa);
            }
            return;
        }

        Map<Integer, ProductAttribute> existingById = existingAttrs.stream()
                .filter(pa -> pa.getId() != null)
                .collect(Collectors.toMap(ProductAttribute::getId, Function.identity(), (a, b) -> a));

        Map<String, ProductAttribute> existingByAttrName = existingAttrs.stream()
                .filter(pa -> pa.getAttribute() != null && pa.getAttribute().getName() != null)
                .collect(Collectors.toMap(pa -> pa.getAttribute().getName().trim().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));

        Set<Integer> keptAttrIds = new HashSet<>();

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

            ProductAttribute target = null;
            if (a.getId() != null && existingById.containsKey(a.getId())) {
                target = existingById.get(a.getId());
            } else if (existingByAttrName.containsKey(a.getName().trim().toLowerCase(Locale.ROOT))) {
                target = existingByAttrName.get(a.getName().trim().toLowerCase(Locale.ROOT));
            }

            if (target == null) {
                target = new ProductAttribute();
                target.setProduct(product);
            }

            target.setAttribute(master);
            target.setValue(a.getValue().trim());
            target.setIsRemoved(false);
            target = productAttributeRepository.save(target);
            keptAttrIds.add(target.getId());
        }

        for (ProductAttribute existing : existingAttrs) {
            if (!keptAttrIds.contains(existing.getId())) {
                existing.setIsRemoved(true);
                productAttributeRepository.save(existing);
            }
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
                .orElse(null);

        Category category = product.getCategory();
        String supplierName = (category != null && category.getDefaultSupplier() != null)
                ? category.getDefaultSupplier().getName()
                : null;
        if (supplierName == null && category != null) {
            List<Supplier> linked = supplierRepository.findActiveByCategoryIds(List.of(category.getId()));
            if (linked != null && !linked.isEmpty()) {
                supplierName = linked.get(0).getName();
            }
        }

        String mainImgUrl = images.stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
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

        List<Product> children = productRepository.findByParent_IdAndIsRemovedFalse(product.getId());
        List<ProductDetailResponse.VariantResponse> variantDTOs = children.stream().map(c -> {
            List<ProductAttribute> cAttrs = productAttributeRepository.findByProductIdAndIsRemovedFalse(c.getId());
            return ProductDetailResponse.VariantResponse.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .sku(c.getSku())
                    .barcode(c.getBarcode())
                    .costPrice(c.getCostPrice())
                    .sellingPrice(c.getSellingPrice())
                    .status(c.getStatus())
                    .attributes(cAttrs.stream().map(a -> ProductDetailResponse.AttributeResponse.builder()
                            .id(a.getId())
                            .name(a.getAttribute() != null ? a.getAttribute().getName() : null)
                            .value(a.getValue())
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
                .baseUnitName(baseUnitName != null ? baseUnitName : (units.isEmpty() ? "sp" : units.get(0).getName()))
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
        if (sell.compareTo(BigDecimal.ZERO) > 0 && cost.compareTo(BigDecimal.ZERO) > 0 && sell.compareTo(cost) < 0) {
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
        validateVariants(request.getVariants(), sku, barcode);
    }

    private void validateVariants(List<UpsertProductRequest.VariantRequest> variants, String parentSku, String parentBarcode) {
        if (variants == null || variants.isEmpty()) {
            return;
        }

        Set<String> seenVariantSkus = new HashSet<>();
        if (parentSku != null) {
            seenVariantSkus.add(parentSku.toLowerCase(Locale.ROOT));
        }

        Set<String> seenVariantBarcodes = new HashSet<>();
        if (parentBarcode != null) {
            seenVariantBarcodes.add(parentBarcode.toLowerCase(Locale.ROOT));
        }

        for (UpsertProductRequest.VariantRequest v : variants) {
            if (v == null) continue;

            BigDecimal cost = nullToZero(v.getCostPrice());
            BigDecimal sell = nullToZero(v.getSellingPrice());
            if (cost.compareTo(BigDecimal.ZERO) < 0 || sell.compareTo(BigDecimal.ZERO) < 0) {
                throw new AppException(ErrorCode.PRODUCT_PRICE_INVALID);
            }
            if (sell.compareTo(BigDecimal.ZERO) > 0 && cost.compareTo(BigDecimal.ZERO) > 0 && sell.compareTo(cost) < 0) {
                throw new AppException(ErrorCode.PRODUCT_SELL_BELOW_COST);
            }

            String vSku = blankToNull(v.getSku());
            if (vSku != null) {
                String skuKey = vSku.toLowerCase(Locale.ROOT);
                if (!seenVariantSkus.add(skuKey)) {
                    throw new AppException(ErrorCode.PRODUCT_SKU_EXISTED);
                }

                boolean exists = v.getId() == null
                        ? productRepository.existsBySkuIgnoreCaseAndIsRemovedFalse(vSku)
                        : productRepository.existsBySkuIgnoreCaseAndIdNotAndIsRemovedFalse(vSku, v.getId());
                if (exists) {
                    throw new AppException(ErrorCode.PRODUCT_SKU_EXISTED);
                }
            }

            String vBarcode = blankToNull(v.getBarcode());
            if (vBarcode != null) {
                String barcodeKey = vBarcode.toLowerCase(Locale.ROOT);
                if (!seenVariantBarcodes.add(barcodeKey)) {
                    throw new AppException(ErrorCode.PRODUCT_BARCODE_EXISTED);
                }

                boolean exists = v.getId() == null
                        ? productRepository.existsByBarcodeAndIsRemovedFalse(vBarcode)
                        : productRepository.existsByBarcodeAndIdNotAndIsRemovedFalse(vBarcode, v.getId());
                if (exists) {
                    throw new AppException(ErrorCode.PRODUCT_BARCODE_EXISTED);
                }
            }
        }
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

    private String generateUniqueSku(Integer id) {
        String baseSku = "SP" + String.format("%06d", id);
        String candidate = baseSku;
        int counter = 1;
        while (productRepository.existsBySkuIgnoreCaseAndIsRemovedFalse(candidate)) {
            candidate = baseSku + "_" + counter;
            counter++;
        }
        return candidate;
    }

    private String generateUniqueChildSku(String parentSku, String suffix, Integer childId) {
        String cleanSuffix = suffix != null ? suffix.replaceAll("[^a-zA-Z0-9-]", "").toUpperCase() : "";
        if (cleanSuffix.isBlank()) {
            cleanSuffix = "VAR";
        }
        String baseSku = parentSku + "-" + cleanSuffix;
        String candidate = baseSku;
        int counter = 1;
        while (childId == null
                ? productRepository.existsBySkuIgnoreCaseAndIsRemovedFalse(candidate)
                : productRepository.existsBySkuIgnoreCaseAndIdNotAndIsRemovedFalse(candidate, childId)) {
            candidate = baseSku + "-" + counter;
            counter++;
        }
        return candidate;
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
            String childSku = generateUniqueChildSku(parentSku, skuClean, null);
            child.setSku(childSku);
            child.setBarcode(null);

            child = productRepository.save(child);

            mergeUnits(child, request.getUnits());
            mergeAttributes(child, combo);
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
        List<Product> existingChildren = productRepository.findByParent_IdAndIsRemovedFalse(parentProduct.getId());
        Map<Integer, Product> existingMap = existingChildren.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        Set<Integer> keptIds = new HashSet<>();

        if (variantRequests != null && !variantRequests.isEmpty()) {
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
                    String slug = vr.getName() != null ? vr.getName().replaceAll("[^a-zA-Z0-9-]", "").toUpperCase() : "";
                    if (slug.isBlank() && vr.getAttributes() != null) {
                        slug = vr.getAttributes().stream()
                                .map(UpsertProductRequest.AttributeRequest::getValue)
                                .filter(Objects::nonNull)
                                .collect(Collectors.joining("-"))
                                .replaceAll("[^a-zA-Z0-9-]", "")
                                .toUpperCase();
                    }
                    child.setSku(generateUniqueChildSku(parentSku, slug, child.getId()));
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
                String childStatus = vr.getStatus() != null ? vr.getStatus() : parentProduct.getStatus();
                if ("inactive".equalsIgnoreCase(parentProduct.getStatus())) {
                    childStatus = "inactive";
                }
                child.setStatus(childStatus);
                child.setDescription(parentProduct.getDescription());
                child.setSeasonTag(parentProduct.getSeasonTag());

                child = productRepository.save(child);
                keptIds.add(child.getId());

                mergeUnitsForChild(child, parentUnits);
                mergeAttributes(child, vr.getAttributes());
            }
        }

        // Soft delete child variants that were removed in UI
        for (Product existing : existingChildren) {
            if (!keptIds.contains(existing.getId())) {
                existing.setIsRemoved(true);
                long ts = System.currentTimeMillis();
                if (existing.getSku() != null && !existing.getSku().contains("_del_")) {
                    String base = existing.getSku();
                    if (base.length() > 30) base = base.substring(0, 30);
                    existing.setSku(base + "_del_" + ts);
                }
                if (existing.getBarcode() != null && !existing.getBarcode().contains("_del_")) {
                    String base = existing.getBarcode();
                    if (base.length() > 30) base = base.substring(0, 30);
                    existing.setBarcode(base + "_del_" + ts);
                }
                productRepository.save(existing);
            }
        }
    }

    private void mergeUnitsForChild(Product child, List<UpsertProductRequest.UnitRequest> parentUnits) {
        if (parentUnits == null || parentUnits.isEmpty()) {
            mergeUnits(child, null);
            return;
        }
        List<UpsertProductRequest.UnitRequest> childUnits = parentUnits.stream().map(pu -> {
            UpsertProductRequest.UnitRequest cu = new UpsertProductRequest.UnitRequest();
            cu.setName(pu.getName());
            cu.setUnitBase(pu.getUnitBase());
            cu.setIsBase(pu.getIsBase());
            // Tính giá bán quy đổi theo giá bán cơ bản của chính biến thể con đó
            if (Boolean.TRUE.equals(pu.getIsBase()) || (pu.getUnitBase() != null && pu.getUnitBase().compareTo(BigDecimal.ONE) == 0)) {
                cu.setSellingPrice(child.getSellingPrice());
            } else {
                cu.setSellingPrice(derivePrice(child.getSellingPrice(), pu.getUnitBase()));
            }
            return cu;
        }).toList();
        mergeUnits(child, childUnits);
    }
}
