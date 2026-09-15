package project.be_sep490_g67.enums;

/**
 * Loại thông báo trong hệ thống.
 */
public enum NotificationType {
    /**
     * Thu ngân ghi nợ cho một khách hàng nợ mới — admin cần rà soát hồ sơ.
     */
    DEBT_CUSTOMER_REVIEW,

    /**
     * có mặt hàng tồn dưới hoặc bằng định mức tối thiểu (products.min_stock).
     */
    LOW_STOCK,

    /**
     * có lô đã quá hạn mà vẫn còn hàng trên kệ.
     */
    EXPIRED,

    /**
     * có lô sắp hết hạn trong ngưỡng cảnh báo.
     */
    NEAR_EXPIRED,

    SUPPLIER_DEBT,

    /**
     * có đơn nợ khách hàng đã quá hạn thanh toán mà chưa trả hết.
     */
    OVERDUE_DEBT,

}
