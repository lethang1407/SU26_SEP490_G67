package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderItemResponse {
    Integer productId;
    String productCode;
    String productName;
    String unit;
    Integer quantity;
    BigDecimal costPerUnit;
    BigDecimal lineTotal;
    String expiryDate;
    Integer batchId;
    String batchCode;
    Integer locationId;
    String locationLabel;
}
