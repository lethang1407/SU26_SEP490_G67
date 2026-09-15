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

    // ---- Trạng thái công nợ & hạn đổi trả (nhóm quyết định F) ----
    // Màn đổi trả cần biết những thứ này TRƯỚC khi thu ngân bấm gửi. Thiếu chúng thì
    // giao diện chỉ còn cách gửi lên rồi đọc mã lỗi trả về, tức là để khách đứng chờ
    // rồi mới báo "đơn này quá hạn".

    /** Hóa đơn gốc là đơn bán nợ. */
    Boolean isDebt;
    /** Hạn trả nợ của hóa đơn gốc, null với đơn thường. */
    Instant dueDate;
    /** Tiền khách đã trả ngay lúc mua. */
    BigDecimal paidAmount;
    /** Nợ còn lại theo công thức chung {@code DebtCalculator.remaining}. 0 với đơn thường. */
    BigDecimal debtRemaining;
    /** Đơn nợ đã quá hạn mà chưa trả hết — cấm đổi/trả (quyết định F3). */
    Boolean debtOverdue;
    /** Hết hạn đổi trả (mặc định 4 ngày, quyết định A1) — cấm đổi/trả. */
    Boolean returnWindowExpired;
    /** Thời điểm hết hạn đổi trả, để hiện "còn trả được tới ...". */
    Instant returnDeadline;

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
        BigDecimal lineTotal;
        /** Giá trị thực của dòng sau khi phân bổ giảm giá hóa đơn — cơ sở tính tiền hoàn. */
        BigDecimal netLineTotal;
    }
}
