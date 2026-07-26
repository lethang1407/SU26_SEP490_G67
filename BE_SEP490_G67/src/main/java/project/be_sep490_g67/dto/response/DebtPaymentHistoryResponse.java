package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DebtPaymentHistoryResponse {
    Integer id;
    Integer customerId;
    Integer orderId;
    Instant paymentDate;
    BigDecimal amountPaid;
    String note;
    String customerName;
    String orderCode;
    String paymentMethod;
    String staffName;
}