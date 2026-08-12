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
public class SalesOrderListResponse {

    List<Item> content;
    int page;
    int size;
    long totalElements;
    int totalPages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        Integer id;
        String  orderCode;
        /** Ma phieu tra moi nhat (HDT-...) neu hoa don da co tra hang, null neu chua. */
        String  returnCode;
        Instant createdAt;
        String  customerName;    // null → "Khách lẻ"
        String  customerPhone;   // null → "Khách lẻ"
        BigDecimal totalAmount;
        String  orderStatus;
        String  paymentMethod;

        /**
         * Hóa đơn có được tạo dưới dạng bán nợ không. Khác với
         * {@code paymentMethod = "DEBT"} ở chỗ đây là cờ trên hóa đơn chứ không
         * phải hình thức thanh toán khách chọn lúc mua.
         */
        Boolean isDebt;
        /** Hạn trả nợ, null khi không phải đơn nợ hoặc không đặt hạn. */
        Instant dueDate;
        /** Còn nợ bao nhiêu tại thời điểm gọi API. 0 khi đã trả đủ. */
        BigDecimal remainingDebt;
        /**
         * {@code IN_DEBT} | {@code OVERDUE} | {@code PAID}, xem
         * {@link project.be_sep490_g67.enums.DebtOrderStatus}.
         * Null với hóa đơn không bán nợ — FE dựa vào đây để quyết định có hiện
         * badge nợ hay không.
         */
        String debtStatus;
    }
}
