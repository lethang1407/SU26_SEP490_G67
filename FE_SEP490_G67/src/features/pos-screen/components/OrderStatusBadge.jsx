const STATUS_CONFIG = {
    COMPLETED: { label: 'Hoàn thành', cls: 'badge-completed' },
    CANCELLED: { label: 'Đã hủy', cls: 'badge-cancelled' },
    RETURNED: { label: 'Trả hàng', cls: 'badge-returned' },
    PARTIALLY_RETURNED: { label: 'Trả một phần', cls: 'badge-returned' },
};

/**
 * Badge trạng thái hóa đơn (SalesOrderStatus).
 * Công nợ KHÔNG thuộc enum này — BE không bao giờ gửi orderStatus = "DEBT",
 * đơn bán nợ vẫn là COMPLETED. Nợ hiển thị bằng DebtBadge.
 */
export default function OrderStatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'badge-default' };
    return <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>;
}
