package project.be_sep490_g67.mapper;

import org.springframework.stereotype.Component;
import project.be_sep490_g67.constants.ProductConstants;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductAttribute;
import project.be_sep490_g67.entity.ProductUnit;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class ProductMapper {

    public ProductListResponse toListResponse(Product product, int stock) {
        Product parent = product.getParent();
        return ProductListResponse.builder()
                .id(product.getId())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .code(ProductConstants.formatProductCode(product.getId()))
                .name(product.getName())
                .barcode(product.getBarcode())
                .category(resolveCategoryName(product))
                .importPrice(product.getCostPrice())
                .sellPrice(product.getSellingPrice())
                .stock(stock)
                .supplier("")
                .build();
    }

    public ProductDetailResponse toDetailResponse(
            Product product,
            int stock,
            List<ProductUnit> units,
            List<ProductAttribute> attributes) {
        ProductUnit baseUnit = resolveBaseUnit(units);
        List<ProductUnit> conversionUnits = units.stream()
                .filter(unit -> unit.getUnitBase() != null
                        && unit.getUnitBase().compareTo(BigDecimal.ONE) != 0)
                .toList();

        Product parent = product.getParent();
        return ProductDetailResponse.builder()
                .id(product.getId())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .code(ProductConstants.formatProductCode(product.getId()))
                .name(product.getName())
                .barcode(product.getBarcode())
                .category(resolveCategoryName(product))
                .description(product.getDescription())
                .importPrice(product.getCostPrice())
                .sellPrice(product.getSellingPrice())
                .stock(stock)
                .minStock(product.getMinStock() != null ? product.getMinStock() : 0)
                .businessStatus(resolveBusinessStatus(stock))
                .baseUnit(toBaseUnitResponse(baseUnit, product.getSellingPrice()))
                .conversionUnits(conversionUnits.stream()
                        .map(unit -> toConversionUnitResponse(unit, product.getSellingPrice()))
                        .toList())
                .attributes(attributes.stream().map(this::toAttributeResponse).toList())
                .build();
    }

    public Map<Integer, Integer> toStockMap(List<Object[]> stockRows) {
        if (stockRows == null || stockRows.isEmpty()) {
            return Collections.emptyMap();
        }

        return stockRows.stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (Integer) row[0],
                        row -> ((Number) row[1]).intValue()));
    }

    private ProductBaseUnitResponse toBaseUnitResponse(ProductUnit unit, BigDecimal sellingPrice) {
        String name = unit != null && unit.getName() != null
                ? unit.getName()
                : ProductConstants.DEFAULT_BASE_UNIT_NAME;

        return ProductBaseUnitResponse.builder()
                .name(name)
                .sellPrice(sellingPrice)
                .build();
    }

    private ProductConversionUnitResponse toConversionUnitResponse(ProductUnit unit, BigDecimal sellingPrice) {
        BigDecimal ratio = unit.getUnitBase() != null ? unit.getUnitBase() : BigDecimal.ONE;
        BigDecimal unitSellPrice = sellingPrice != null
                ? sellingPrice.multiply(ratio).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return ProductConversionUnitResponse.builder()
                .id(String.valueOf(unit.getId()))
                .name(unit.getName())
                .ratio(ratio)
                .sellPrice(unitSellPrice)
                .build();
    }

    private ProductAttributeResponse toAttributeResponse(ProductAttribute productAttribute) {
        return ProductAttributeResponse.builder()
                .id(productAttribute.getId())
                .name(productAttribute.getAttribute() != null
                        ? productAttribute.getAttribute().getName()
                        : null)
                .value(productAttribute.getValue())
                .build();
    }

    private ProductUnit resolveBaseUnit(List<ProductUnit> units) {
        return units.stream()
                .filter(unit -> unit.getUnitBase() != null
                        && unit.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                .findFirst()
                .orElse(units.isEmpty() ? null : units.get(0));
    }

    private String resolveCategoryName(Product product) {
        return product.getCategory() != null ? product.getCategory().getName() : "";
    }

    private String resolveBusinessStatus(int stock) {
        return stock > 0
                ? ProductConstants.BUSINESS_STATUS_ACTIVE
                : ProductConstants.BUSINESS_STATUS_INACTIVE;
    }
}
