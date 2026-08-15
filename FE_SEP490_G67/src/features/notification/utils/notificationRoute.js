/**
 * Đích đến khi bấm vào một thông báo.
 *
 * Khách hàng nợ mới do POS tạo sẽ mở thẳng form bổ sung hồ sơ trên trang công nợ
 * (`?completeProfile=<id>`) — đây là lối vào duy nhất còn lại của form đó kể từ
 * khi POS thôi tự điều hướng thu ngân sang trang khách hàng.
 *
 * @returns {string|null} đường dẫn nội bộ, null nếu thông báo không dẫn đi đâu.
 */
export function resolveNotificationTarget(notification) {
    if (!notification?.referenceId) return null;

    switch (notification.notificationType) {
        case 'DEBT_CUSTOMER_REVIEW':
            return `/admin/customer?completeProfile=${notification.referenceId}`;
        default:
            break;
    }

    if (notification.referenceType === 'CUSTOMER') {
        return `/admin/customer/${notification.referenceId}`;
    }
    return null;
}

/** "5 phút trước", "2 giờ trước"... cho danh sách thông báo. */
export function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const then = new Date(isoString).getTime();
    if (Number.isNaN(then)) return '';

    const diffSeconds = Math.round((Date.now() - then) / 1000);
    if (diffSeconds < 60) return 'Vừa xong';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} ngày trước`;
    return new Date(then).toLocaleDateString('vi-VN');
}
