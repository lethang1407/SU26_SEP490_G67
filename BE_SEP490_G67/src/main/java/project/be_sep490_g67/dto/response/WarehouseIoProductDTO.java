package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WarehouseIoProductDTO {
    Integer productId;
    String sku;
    String productName;
    String unitName;
    Integer movementCount;
    Integer openingQty;
    BigDecimal openingAmount;
    Integer importQty;
    BigDecimal importAmount;
    Integer exportQty;
    BigDecimal exportAmount;
    Integer closingQty;
    BigDecimal closingAmount;
    List<WarehouseIoLineDTO> lines;
}
