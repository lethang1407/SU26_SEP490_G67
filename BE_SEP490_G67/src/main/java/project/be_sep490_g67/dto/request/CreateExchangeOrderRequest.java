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

    /**
     * Tiền khách trả thêm cho khoản nợ của hóa đơn gốc ngay tại màn đổi trả (quyết định F2).
     *
     * <p>Được ghi nhận <b>sau</b> bước cấn trừ hàng trả, không phải trước: làm ngược lại sẽ
     * có tình huống khách nộp tiền xong lại được hoàn về vì hàng trả đã xóa hết nợ.
     */
    @PositiveOrZero(message = "Số tiền khách trả thêm không được âm")
    BigDecimal debtPaymentAmount;

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

        /**
         * Ghi chú của riêng dòng này. itemCondition chỉ có 4 giá trị cố định;
         * những lý do nằm ngoài 4 giá trị đó (cận date, bao bì móp, khách đổi ý)
         * được ghi ở đây chứ không dồn vào returnNote của cả phiếu.
         */
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
