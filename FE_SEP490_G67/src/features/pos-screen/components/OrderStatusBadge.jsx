const STATUS_CONFIG = {
    COMPLETED: { label: 'Hoàn thành', cls: 'badge-completed' },
    CANCELLED: { label: 'Đã hủy', cls: 'badge-cancelled' },
    RETURNED: { label: 'Trả hàng', cls: 'badge-returned' },
    PARTIALLY_RETURNED: { label: 'Trả một phần', cls: 'badge-returned' },
    DEBT: { label: 'Bán nợ', cls: 'badge-debt' },
};

/** Badge trạng thái hóa đơn */
export default function OrderStatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'badge-default' };
    return <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>;
}
