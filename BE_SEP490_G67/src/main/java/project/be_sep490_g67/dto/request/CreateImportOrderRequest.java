package project.be_sep490_g67.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateImportOrderRequest {
    List<OrderLine> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderLine {
        Integer productId;
        Integer supplierId;
        Integer quantity;
        Integer coverDays;
        LocalDate orderDate;
        /** Optional — giá NCC đã chọn trên panel; null = dùng products.cost_price */
        BigDecimal costPerUnit;
    }
}
