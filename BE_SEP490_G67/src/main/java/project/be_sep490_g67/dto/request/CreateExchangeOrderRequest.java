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
     * Mã phiên PayOS đã thu tiền cho phần khách phải bù thêm của phiếu đổi này.
     *
     * <p>Bắt buộc khi {@code refundMethod = TRANSFER} mà phiếu có tiền thu vào
     * (hàng lấy mới đắt hơn hàng trả lại), và phải để trống trong mọi trường hợp
     * còn lại. Không có nó thì khoản tiền khách chuyển nằm ngoài sổ, không đối
     * chiếu được với chứng từ nào.
     *
     * <p>Chiều hoàn tiền cho khách không dùng field này: cửa hàng chuyển đi chứ
     * không thu về, PayOS không tham gia.
     */
    Long payosOrderCode;

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
