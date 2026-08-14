package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateSalesOrderRequest {

    Integer customerId;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    String paymentMethod;   // CASH | TRANSFER | DEBT

    BigDecimal discountAmount;

    /**
     * Chỉ dùng cho đơn nợ: số tiền khách trả trước. Null hoặc 0 = nợ toàn bộ.
     * Đơn thường bỏ qua field này, paidAmount luôn bằng tổng phải trả.
     */
    @PositiveOrZero(message = "Số tiền trả trước không được âm")
    BigDecimal paidAmount;

    /** Chỉ dùng cho đơn nợ: hạn trả nợ. */
    Instant dueDate;

    String note;

    @NotEmpty(message = "Đơn hàng phải có ít nhất một sản phẩm")
    @Valid
    List<OrderItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @NotNull(message = "productId không được để trống")
        private Integer productId;

        // @NotNull(message = "batchId không được để trống")
        private Integer batchId;

        /**
         * Ô lấy hàng do thu ngân chọn trên POS. Null thì hệ thống tự trừ FEFO
         * toàn kho như cũ (dùng cho các client chưa cập nhật).
         *
         * @deprecated dùng {@link #locationIds}; giữ lại cho client cũ.
         */
        @Deprecated
        Integer locationId;

        /**
         * Nhiều ô lấy hàng cho cùng một dòng, trong mỗi ô thì FIFO theo lô.
         *
         * @deprecated dùng {@link #picks} để chỉ rõ cả lô; giữ lại cho client cũ.
         */
        @Deprecated
        List<Integer> locationIds;

        /**
         * Các lô-tại-ô thu ngân đã tick trên POS, theo đúng thứ tự muốn lấy.
         * Trừ hết cái trước rồi mới sang cái sau. Ưu tiên hơn locationIds.
         */
        List<StockPickRequest> picks;

        Integer productUnitId;

        @NotNull(message = "quantity không được để trống")
        @Min(1)
        Integer quantity;

        @NotNull(message = "unitPrice không được để trống")
        BigDecimal unitPrice;

        BigDecimal discountAmount;
    }

    /** Một lô đang nằm ở một ô — đúng một dòng thu ngân tick trên POS. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockPickRequest {
        @NotNull(message = "locationId không được để trống")
        Integer locationId;

        /** Null = lấy FIFO mọi lô đang nằm ở ô này. */
        Integer batchId;
    }
}
