package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueTransactionRowResponse {
    Integer orderId;
    String source;           // "Phiếu bán" | "Phiếu trả"
    String orderCode;
    String orderStatus;      // COMPLETED | PARTIALLY_RETURNED | RETURNED
    Instant createdAt;
    String customerName;
    String staffName;
    String paymentMethod;
    BigDecimal totalAmount;
    BigDecimal discountAmount;
    BigDecimal netAmount;    // totalAmount after refund adjustments
}
