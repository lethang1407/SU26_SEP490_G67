package project.be_sep490_g67.enums;

/**
 * Loại thông báo trong hệ thống. Lưu xuống DB dưới dạng tên enum
 * (cột notifications.notification_type) nên FE nhận về đúng chuỗi này.
 */
public enum NotificationType {
    /** Thu ngân ghi nợ cho một khách hàng nợ mới — admin cần rà soát hồ sơ. */
    DEBT_CUSTOMER_REVIEW
}
