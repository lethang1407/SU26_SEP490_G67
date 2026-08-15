package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
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
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BatchDebtPaymentRequest {

    @NotEmpty(message = "Danh sách đơn nợ không được để trống")
    List<Integer> salesOrderIds;

    @NotNull(message = "Số tiền trả không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền trả phải lớn hơn 0")
    BigDecimal amountPaid;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    PaymentMethod paymentMethod;

    String note;

    Instant paymentDate;
}
