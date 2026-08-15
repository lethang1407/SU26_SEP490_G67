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
public class SalesOrderDetailResponse {
    Integer id;
    String orderCode;
    String paymentMethod;
    String orderStatus;
    Boolean isDebt;
    BigDecimal subtotal;
    BigDecimal discountAmount;
    BigDecimal totalAmount;
    BigDecimal paidAmount;
    Instant dueDate;
    String note;
    Instant createdAt;
    CustomerInfo customer;
    List<OrderItemInfo> items;
    List<ReturnOrderInfo> returnOrders;

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
        Integer salesOrderDetailId;
        Integer productId;
        String productCode;
        String productName;
        String unitName;
        Integer quantityPurchased;
        Integer quantityReturned;
        Integer quantityReturnable;
        Boolean productReturnable;
        BigDecimal unitPrice;
        BigDecimal discountAmount;
        BigDecimal lineTotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnOrderInfo {
        Integer returnOrderId;
        String returnCode;
        String returnReason;
        String resolutionType;
        BigDecimal refundAmount;
        /** Phần refundAmount đã cấn vào công nợ. Đọc lại từ DB, không tính lại. */
        BigDecimal debtOffsetAmount;
        /** Phần refundAmount đã chi bằng tiền mặt. Đọc lại từ DB, không tính lại. */
        BigDecimal cashRefundAmount;
        String note;
        Instant createdAt;
        List<ReturnItemInfo> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemInfo {
        Integer returnOrderDetailId;
        Integer salesOrderDetailId;
        Integer productId;
        String productCode;
        String productName;
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal lineRefund;
        String resolutionType;
        String itemCondition;
        String note;
    }
}
