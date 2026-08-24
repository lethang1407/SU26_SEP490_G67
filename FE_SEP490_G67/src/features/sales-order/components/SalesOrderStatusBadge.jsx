export default function SalesOrderStatusBadge({ status, isDebt }) {
    const key = String(status || '');
    let cls = 'sales-order-status--default';
    let label = key || '—';

    const upper = key.toUpperCase();
    if (upper === 'COMPLETED') {
        cls = 'sales-order-status--completed';
        label = 'Hoàn thành';
    } else if (upper === 'CANCELLED') {
        cls = 'sales-order-status--cancelled';
        label = 'Đã hủy';
    } else if (upper === 'RETURNED' || key === 'TRẢ HÀNG') {
        cls = 'sales-order-status--returned';
        label = 'Đã đổi/trả';
    }

    return (
        <span className="sales-order-status-wrap">
            <span className={`sales-order-status ${cls}`}>{label}</span>
            {isDebt ? (
                <span className="sales-order-status sales-order-status--debt">Ghi nợ</span>
            ) : null}
        </span>
    );
}
