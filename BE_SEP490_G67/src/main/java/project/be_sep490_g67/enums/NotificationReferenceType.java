package project.be_sep490_g67.enums;

/**
 * Đối tượng mà thông báo trỏ tới (cột notifications.reference_type).
 * FE dựa vào cặp referenceType + referenceId để điều hướng khi bấm thông báo.
 */
public enum NotificationReferenceType {
    CUSTOMER,
    SALES_ORDER
}
