package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import project.be_sep490_g67.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DebtPaymentRequest {

    @NotNull(message = "ID đơn hàng không được để trống")
    Integer salesOrderId;

    @NotNull(message = "Số tiền trả không được để trống")
    @Min(value = 1, message = "Số tiền trả phải lớn hơn 0")
    BigDecimal amountPaid;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    PaymentMethod paymentMethod;

    String note;

    Instant paymentDate;
}
