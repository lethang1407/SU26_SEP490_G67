package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderItemResponse {
    Integer id;
    Integer productId;
    String productCode;
    String productName;
    Integer quantity;
    BigDecimal costPerUnit;
    BigDecimal lineTotal;
    LocalDate expiryDate;
    String note;
}
