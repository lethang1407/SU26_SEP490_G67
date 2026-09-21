package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PriceHistoryResponse {
    Integer id;
    Integer orderId;
    String orderCode;
    Integer supplierId;
    String supplierName;
    LocalDate orderDate;
    Instant createdAt;

    BigDecimal price;          // Backward compatibility (same as costPerUnit)
    BigDecimal costPerUnit;
    Integer quantity;
    String unitName;
    BigDecimal unitBase;
    String baseUnitName;
    BigDecimal baseCostPerUnit;

    String changeType;
    BigDecimal oldCostPrice;
    BigDecimal newCostPrice;
    BigDecimal oldSellingPrice;
    BigDecimal newSellingPrice;

    String note;
    BigDecimal lineTotal;
    LocalDate expiryDate;
}

