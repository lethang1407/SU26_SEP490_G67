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
public class AvailableBatchLocationResponse {
    Integer id;
    Integer batchId;
    Integer locationId;
    String productCode;
    String productName;
    String unit;
    String batchCode;
    String locationLabel;
    Integer systemQty;
    BigDecimal importPrice;
    String expiryDate;
}
