package project.be_sep490_g67.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateProductRequest {

    String name;

    String category;

    String description;

    String brand;

    BigDecimal importPrice;

    BigDecimal sellPrice;

    String businessStatus;

    ProductBaseUnitRequest baseUnit;

    List<ProductConversionUnitRequest> conversionUnits;
}
