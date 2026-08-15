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

    // ---- Quyết toán công nợ (nhóm quyết định F) ----
    // Với đơn thường, originalIsDebt = false và mọi con số nợ ở đây bằng 0, nên FE dùng
    // được cùng một khối hiển thị cho cả hai loại đơn.

    /** Hóa đơn gốc có phải đơn bán nợ không. */
    Boolean originalIsDebt;
    /** Nợ còn lại của hóa đơn gốc TRƯỚC khi đổi/trả. */
    BigDecimal debtRemainingBefore;
    /** Phần hàng trả được trừ thẳng vào nợ, không ra tiền mặt. */
    BigDecimal debtOffsetAmount;
    /** Phần credit dùng trả cho hàng đổi ra. */
    BigDecimal exchangeCreditAmount;
    /** Tiền mặt thực hoàn cho khách — luôn ≤ số khách đã thực trả cho hóa đơn gốc. */
    BigDecimal cashRefundAmount;
    /** Tiền khách bù thêm tại quầy cho hàng đổi đắt hơn (đơn thường). */
    BigDecimal cashCollectAmount;
    /** Phần chênh được ghi nợ trên đơn đổi (đơn còn nợ — quyết định F1). */
    BigDecimal newDebtOnExchange;
    /** Tiền khách chủ động trả thêm cho nợ cũ ngay tại màn đổi trả (quyết định F2). */
    BigDecimal debtPaymentCollected;
    /** Nợ còn lại của hóa đơn gốc SAU khi đã cấn trừ và thu thêm. */
    BigDecimal debtRemainingAfter;

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
