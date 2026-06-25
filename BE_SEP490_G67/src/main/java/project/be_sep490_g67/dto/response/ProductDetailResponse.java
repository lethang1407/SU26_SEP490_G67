package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductDetailResponse {

    Integer id;

    String code;

    String name;

    String barcode;

    String category;

    String description;

    BigDecimal importPrice;

    BigDecimal sellPrice;

    Integer stock;

    Integer minStock;

    String businessStatus;

    String productImg;

    ProductBaseUnitResponse baseUnit;

    List<ProductConversionUnitResponse> conversionUnits;

    List<ProductImageResponse> images;

    List<ProductAttributeResponse> attributes;
}
