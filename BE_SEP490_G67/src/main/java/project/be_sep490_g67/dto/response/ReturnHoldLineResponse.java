package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReturnHoldLineResponse {

    Integer returnDetailId;
    /** Mã phiếu khách trả hàng. */
    String returnCode;

    Integer productId;
    String productName;
    String productSku;

    /** DAMAGED | EXPIRED | OPENED ... */
    String itemCondition;
    /** "Hỏng", "Hết hạn", "Đã mở" — cùng nhãn với phần xem trước trên thẻ. */
    String conditionLabel;

    int quantity;
    String unitName;
    String note;

    /** Thời điểm khách trả hàng (tạo dòng trả). */
    Instant returnedAt;
    /** Số ngày đã nằm chờ ở khu đổi trả. */
    long daysWaiting;
}
