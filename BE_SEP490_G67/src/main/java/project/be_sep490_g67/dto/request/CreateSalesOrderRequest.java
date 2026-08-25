package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
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

    @PositiveOrZero(message = "Số tiền trả trước không được âm")
    BigDecimal paidAmount;

    /**
     * Chỉ dùng cho đơn nợ: hạn trả nợ.
     */
    Instant dueDate;

    String note;

    /**
     * Nội dung chuyển khoản đã in trên mã VietQR khách vừa quét.
     */
    @Size(max = 100, message = "Nội dung chuyển khoản tối đa 100 ký tự")
    String paymentReference;

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

        @Deprecated
        Integer locationId;

        @Deprecated
        List<Integer> locationIds;

        List<StockPickRequest> picks;

        Integer productUnitId;

        @NotNull(message = "quantity không được để trống")
        @Min(1)
        Integer quantity;

        @NotNull(message = "unitPrice không được để trống")
        BigDecimal unitPrice;

        BigDecimal discountAmount;
    }

    /**
     * Một lô đang nằm ở một ô - đúng một dòng thu ngân tick trên POS.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockPickRequest {
        @NotNull(message = "locationId không được để trống")
        Integer locationId;

        /**
         * Null = lấy FIFO mọi lô đang nằm ở ô này.
         */
        Integer batchId;
    }
}
