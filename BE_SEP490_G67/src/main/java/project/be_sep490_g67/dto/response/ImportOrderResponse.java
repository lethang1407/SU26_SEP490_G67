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
public class ImportOrderResponse {
    Integer id;
    String orderCode;
    Integer supplierId;
    String supplierName;
    BigDecimal totalCost;
    Boolean urgent;
    List<Line> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {
        Integer productId;
        String productName;
        Integer quantity;
        BigDecimal costPerUnit;
        BigDecimal lineTotal;
    }
}
