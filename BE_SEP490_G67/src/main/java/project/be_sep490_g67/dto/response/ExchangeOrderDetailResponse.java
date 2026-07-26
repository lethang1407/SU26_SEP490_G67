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
public class ExchangeOrderDetailResponse {
    Integer orderId;
    String orderCode;
    BigDecimal totalAmount;
    String paymentMethod;
    String orderStatus;
    Instant createdAt;
    CustomerInfo customer;
    List<OrderItemInfo> items;

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
    public static class OrderItemInfo {
        Integer productId;
        String productCode;
        String productName;
        String unitName;
        Integer quantityPurchased;
        BigDecimal unitPrice;
        BigDecimal lineTotal;
    }
}
