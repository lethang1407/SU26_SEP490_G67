package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductListResponse {

    Integer id;

    Integer parentId;

    String parentName;

    String code;

    String name;

    String barcode;

    String category;

    BigDecimal importPrice;

    BigDecimal sellPrice;

    Integer stock;

    String supplier;
}
