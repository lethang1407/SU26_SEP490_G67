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
public class ExchangeOrderResponse {
    Integer returnOrderId;
    String returnCode;
    Integer originalOrderId;
    String originalOrderCode;
    
    BigDecimal originalTotalAmount;
    BigDecimal returnSubtotal;
    BigDecimal returnDiscount;
    BigDecimal totalReturnAmount;
    
    BigDecimal exchangeSubtotal;
    BigDecimal exchangeDiscount;
    BigDecimal totalExchangeAmount;
    
    BigDecimal netAmount;  // Positive = need to refund customer, Negative = customer pays more
    String refundMethod;
    String returnNote;
    Instant createdAt;

    List<ReturnItemInfo> returnItems;
    List<ExchangeItemInfo> exchangeItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemInfo {
        Integer salesOrderDetailId;
        Integer productId;
        String productCode;
        String productName;
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal lineTotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExchangeItemInfo {
        Integer productId;
        String productCode;
        String productName;
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal discountAmount;
        BigDecimal lineTotal;
    }
}
