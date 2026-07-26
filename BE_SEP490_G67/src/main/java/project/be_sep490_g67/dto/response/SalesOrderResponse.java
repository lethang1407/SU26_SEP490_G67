package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SalesOrderResponse {
    Integer id;
    String orderCode;
    String paymentMethod;
    String orderStatus;
    Boolean isDebt;
    BigDecimal subtotal;
    BigDecimal discountAmount;
    BigDecimal totalAmount;
    BigDecimal paidAmount;
    Instant createdAt;
    CustomerInfo customer;
    List<SalesOrderDetailInfo> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        Integer id;
        String fullName;
        String phoneNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesOrderDetailInfo {
        Integer productId;
        String name;
        /** Snapshot of the unit name chosen by the cashier at sale time (UC-40/41). */
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal discountAmount;
        BigDecimal lineTotal;
    }
}
