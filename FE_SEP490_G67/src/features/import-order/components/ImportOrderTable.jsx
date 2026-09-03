import { Link } from 'react-router-dom';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '../constants';
import { formatCurrency, formatDate, formatDateTime } from '../utils/importOrderUtils';

export default function ImportOrderTable({
    items,
    loading,
    startIndex = 1,
    emptyMessage = 'Không tìm thấy phiếu nhập hàng phù hợp.',
    onOpenDetail,
}) {
    if (loading) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Đang tải danh sách phiếu nhập hàng...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table import-order-table">
                    <thead>
                        <tr>
                            <th className="supplier-table__stt">STT</th>
                            <th>Mã nhập hàng</th>
                            <th title="Phiếu đã nhập: ngày nhập kho. Phiếu tạm: ngày lập phiếu.">
                                Thời gian
                            </th>
                            <th>Nhà cung cấp</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((order, index) => {
                            const totalCost = Number(order.totalCost) || 0;
                            const isDraft = order.orderStatus === ORDER_STATUS.DRAFT;
                            const stt = startIndex + index;
                            const dateLabel = !isDraft && order.receivedDate
                                ? formatDate(order.receivedDate)
                                : formatDateTime(order.receivedAt || order.createdAt);

                            return (
                                <tr
                                    key={order.id}
                                    className="supplier-table__row import-order-table__row--clickable"
                                    onClick={() => onOpenDetail?.(order.id)}
                                >
                                    <td className="supplier-table__stt">{stt}</td>
                                    <td className="supplier-table__code-text">
                                        {isDraft ? (
                                            <Link
                                                to={`/admin/warehouse/import/${order.id}/edit`}
                                                className="import-order-table__code-link"
                                                title="Mở lại phiếu tạm để sửa"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {order.orderCode}
                                            </Link>
                                        ) : (
                                            <span className="import-order-table__code-text">
                                                {order.orderCode}
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        className="supplier-table__nowrap"
                                        title={
                                            !isDraft && order.receivedDate
                                                ? 'Ngày nhập kho'
                                                : 'Ngày lập phiếu tạm'
                                        }
                                    >
                                        {dateLabel}
                                    </td>
                                    <td className="supplier-table__name" title={order.supplierName || undefined}>
                                        {order.supplierName || '—'}
                                    </td>
                                    <td className="supplier-table__nowrap">
                                        <div>{formatCurrency(isDraft ? 0 : totalCost)}</div>
                                    </td>
                                    <td>
                                        <span
                                            className={`import-order-status import-order-status--${order.orderStatus?.toLowerCase()}`}
                                        >
                                            {ORDER_STATUS_LABEL[order.orderStatus] || order.orderStatus}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
