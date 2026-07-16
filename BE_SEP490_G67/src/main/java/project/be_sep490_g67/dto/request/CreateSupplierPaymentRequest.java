package project.be_sep490_g67.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateSupplierPaymentRequest {
    Integer orderId;
    BigDecimal amount;
    String paymentMethod;
    String note;
}
