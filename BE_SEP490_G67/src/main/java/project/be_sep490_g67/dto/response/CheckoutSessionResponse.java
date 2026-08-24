package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import project.be_sep490_g67.enums.PayosPaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CheckoutSessionResponse {

    Long payosOrderCode;
    String paymentLinkId;
    BigDecimal amount;
    PayosPaymentStatus status;

    String qrCode;
    String checkoutUrl;

    String bin;
    String accountNumber;
    String accountName;
    String description;

    /** Mã giao dịch ngân hàng; chỉ có sau khi tiền về. */
    String paymentReference;

    Instant expiredAt;
    Instant paidAt;

    /** Đơn bán đã ghi sổ từ phiên này, null nếu chưa ghi. */
    Integer salesOrderId;
}
