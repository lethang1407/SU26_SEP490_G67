package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateSalesOrderRequest {

    /** Present for standard invoice. Null for debt/anonymous invoice. */
    Integer customerId;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    String paymentMethod;   // CASH | TRANSFER | DEBT

    BigDecimal discountAmount;

    String note;

    @NotEmpty(message = "Đơn hàng phải có ít nhất một sản phẩm")
    @Valid
    List<OrderItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @NotNull(message = "productId không được để trống")
        Integer productId;

        @NotNull(message = "batchId không được để trống")
        Integer batchId;

        @NotNull(message = "quantity không được để trống")
        Integer quantity;

        @NotNull(message = "unitPrice không được để trống")
        BigDecimal unitPrice;

        BigDecimal discountAmount;
    }
}
