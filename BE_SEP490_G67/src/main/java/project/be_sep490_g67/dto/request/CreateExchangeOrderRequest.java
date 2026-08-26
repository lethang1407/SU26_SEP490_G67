package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateExchangeOrderRequest {

    Integer originalOrderId;

    @NotEmpty(message = "Phải có ít nhất một sản phẩm trả lại")
    @Valid
    List<ReturnItemRequest> returnItems;

    @Valid
    List<ExchangeItemRequest> exchangeItems;

    String returnNote;

    @NotNull(message = "Phương thức hoàn tiền không được để trống")
    String refundMethod;   // CASH | TRANSFER

    BigDecimal returnDiscount;
    BigDecimal exchangeDiscount;

    @PositiveOrZero(message = "Số tiền khách trả thêm không được âm")
    BigDecimal debtPaymentAmount;

    /**
     * Nội dung chuyển khoản đã in trên mã VietQR, cho phần tiền khách phải bù thêm
     * của phiếu đổi này (hàng lấy mới đắt hơn hàng trả lại).
     * Chỉ gửi khi {@code refundMethod = TRANSFER} và phiếu có tiền thu vào; phải
     * để trống trong mọi trường hợp còn lại. Chiều hoàn tiền cho khách không dùng
     * field này: cửa hàng chuyển đi chứ không thu về, không có mã QR nào cả.
     */
    @Size(max = 100, message = "Nội dung chuyển khoản tối đa 100 ký tự")
    String paymentReference;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemRequest {

        Integer salesOrderDetailId;

        @NotNull(message = "ID sản phẩm không được để trống")
        Integer productId;

        @NotNull(message = "Số lượng trả không được để trống")
        @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
        Integer quantity;

        @Deprecated
        BigDecimal unitPrice;
        String unitName;
        String resolutionType;
        String itemCondition;
        String itemNote;
        String pairedExchangeItemRef;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExchangeItemRequest {
        String ref;

        @NotNull(message = "ID sản phẩm không được để trống")
        Integer productId;

        Integer batchId;

        Integer productUnitId;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        Integer quantity;

        @NotNull(message = "Đơn giá không được để trống")
        BigDecimal unitPrice;

        BigDecimal discountAmount;
    }
}
