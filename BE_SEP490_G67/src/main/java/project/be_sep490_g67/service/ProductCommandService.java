package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import project.be_sep490_g67.dto.request.UpsertProductRequest;
import project.be_sep490_g67.dto.response.ProductDetailDTO;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

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
    public ProductDetailDTO create(UpsertProductRequest request) {
        validateRequest(request, null);
        Category category = categoryRepository.findById(request.getCategoryId())
                .filter(c -> !Boolean.TRUE.equals(c.getIsRemoved()))
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        Product product = new Product();
        applyScalarFields(product, request, category);
        product = productRepository.save(product);

        replaceUnits(product, request.getUnits());
        replaceAttributes(product, request.getAttributes());

        return toDetail(product.getId());
    }

    @Transactional(readOnly = true)
    public ProductDetailDTO getById(Integer id) {
        return toDetail(id);
    }

    @Transactional
    public ProductDetailDTO update(Integer id, UpsertProductRequest request) {
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

        return toDetail(id);
    }

    @Transactional
    public ProductDetailDTO.ImageDTO uploadImage(Integer productId, MultipartFile file) {
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
            product.setProductImg(uploaded.url());
            productRepository.save(product);
        }

        return ProductDetailDTO.ImageDTO.builder()
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
            if (remain.isEmpty()) {
                product.setProductImg(null);
            } else {
                ProductImage next = remain.get(0);
                next.setIsMain(true);
                productImageRepository.save(next);
                product.setProductImg(next.getUrl());
            }
            productRepository.save(product);
        }
    }

    private void applyScalarFields(Product product, UpsertProductRequest request, Category category) {
        product.setName(request.getName().trim());
        product.setSku(blankToNull(request.getSku()));
        product.setBarcode(blankToNull(request.getBarcode()));
        product.setCategory(category);
        product.setBrand(blankToNull(request.getBrand()));
        product.setDescription(request.getDescription());
        product.setStatus(normalizeStatus(request.getStatus()));
        product.setCostPrice(nullToZero(request.getCostPrice()));
        product.setSellingPrice(nullToZero(request.getSellingPrice()));
        product.setVatPercent(request.getVatPercent() == null ? new BigDecimal("10") : request.getVatPercent());
        product.setSeasonTag(blankToNull(request.getSeasonTag()));
        product.setCoverDaysOverride(request.getCoverDaysOverride());
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
            unit.setSellingPrice(u.getSellingPrice() != null ? u.getSellingPrice() : product.getSellingPrice());
            productUnitRepository.save(unit);
        }
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

    private ProductDetailDTO toDetail(Integer id) {
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

        return ProductDetailDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .sku(product.getSku())
                .barcode(product.getBarcode())
                .categoryId(category != null ? category.getId() : null)
                .categoryName(category != null ? category.getName() : null)
                .brand(product.getBrand())
                .description(product.getDescription())
                .status(product.getStatus())
                .costPrice(product.getCostPrice())
                .sellingPrice(product.getSellingPrice())
                .vatPercent(product.getVatPercent())
                .seasonTag(product.getSeasonTag())
                .coverDaysOverride(product.getCoverDaysOverride())
                .categoryCoverDays(category != null && category.getCoverDays() != null
                        ? category.getCoverDays()
                        : 7)
                .supplierName(supplierName)
                .productImg(product.getProductImg())
                .baseUnitName(baseUnitName)
                .units(units.stream().map(u -> ProductDetailDTO.UnitDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .sellingPrice(u.getSellingPrice())
                        .isBase(u.getUnitBase() != null && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                        .build()).toList())
                .attributes(attrs.stream().map(a -> ProductDetailDTO.AttributeDTO.builder()
                        .id(a.getId())
                        .name(a.getAttribute() != null ? a.getAttribute().getName() : null)
                        .value(a.getValue())
                        .build()).toList())
                .images(images.stream().map(img -> ProductDetailDTO.ImageDTO.builder()
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
        if (!"active".equals(status) && !"inactive".equals(status)) {
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
}
