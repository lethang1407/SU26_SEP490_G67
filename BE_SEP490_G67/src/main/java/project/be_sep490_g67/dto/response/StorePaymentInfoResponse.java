package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Thông tin tài khoản nhận chuyển khoản của cửa hàng mang đúng những trường in lên mã QR.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StorePaymentInfoResponse {

    String storeName;

    /**
     * Mã BIN ngân hàng theo chuẩn NAPAS, ví dụ 970422 = MB Bank. NULL khi chưa cấu hình.
     */
    String bankId;

    String bankAccountNo;

    String bankAccountName;
}
