package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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

    @NotNull(message = "ID đơn hàng gốc không được để trống")
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnItemRequest {
        @NotNull(message = "ID sản phẩm không được để trống")
        Integer productId;

        @NotNull(message = "Số lượng trả không được để trống")
        @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
        Integer quantity;

        @NotNull(message = "Đơn giá không được để trống")
        BigDecimal unitPrice;

        String unitName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExchangeItemRequest {
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
