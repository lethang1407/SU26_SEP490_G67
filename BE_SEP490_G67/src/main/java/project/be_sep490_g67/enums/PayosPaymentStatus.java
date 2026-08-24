package project.be_sep490_g67.enums;

/**
 * Trạng thái một phiên thanh toán chuyển khoản PayOS.
 */
public enum PayosPaymentStatus {
    /** Đã tạo QR, đang chờ khách quét. */
    PENDING,
    /** Ngân hàng đang xử lý, chưa ghi có. */
    PROCESSING,
    /** Tiền đã về đủ — chỉ trạng thái này mới được ghi sổ đơn bán. */
    PAID,
    /** Khách chuyển thiếu; thu ngân phải xử lý tay, không tự ghi sổ. */
    UNDERPAID,
    /** Thu ngân hoặc khách hủy. */
    CANCELLED,
    /** Hết hạn QR mà chưa có tiền về. */
    EXPIRED,
    FAILED;

    public boolean isTerminal() {
        return this == PAID || this == CANCELLED || this == EXPIRED || this == FAILED;
    }
}
