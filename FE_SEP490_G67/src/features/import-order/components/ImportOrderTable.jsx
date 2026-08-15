import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import ImportOrderExpandPanel from './ImportOrderExpandPanel';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '../constants';
import { formatCurrency, formatDate, formatDateTime } from '../utils/importOrderUtils';

const COLUMN_COUNT = 5;

export default function ImportOrderTable({
    items,
    loading,
    expandedId,
    onToggleExpand,
    onDraftCancelled,
}) {
    if (loading) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Đang tải danh sách đơn nhập hàng...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Không tìm thấy đơn nhập hàng phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table import-order-table">
                    <thead>
                        <tr>
                            <th>Mã nhập hàng</th>
                            <th title="Phiếu đã nhập: ngày nhập kho. Phiếu tạm: ngày lập phiếu.">
                                Ngày
                            </th>
                            <th>Nhà cung cấp</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((order) => {
                            const totalCost = Number(order.totalCost) || 0;
                            const isDraft = order.orderStatus === ORDER_STATUS.DRAFT;
                            const isExpanded = expandedId === order.id;
                            // Đã nhập → ngày nhập kho; phiếu tạm → ngày/giờ tạo phiếu
                            const dateLabel = !isDraft && order.receivedDate
                                ? formatDate(order.receivedDate)
                                : formatDateTime(order.receivedAt || order.createdAt);

                            return (
                                <Fragment key={order.id}>
                                    <tr
                                        className={`supplier-table__row import-order-table__row--expandable ${
                                            isExpanded ? 'supplier-table__row--expanded' : ''
                                        }`}
                                        onClick={() => onToggleExpand?.(order.id)}
                                        aria-expanded={isExpanded}
                                    >
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
                                    {isExpanded && (
                                        <tr className="supplier-table__expand-row">
                                            <td colSpan={COLUMN_COUNT} className="supplier-table__expand-cell">
                                                <ImportOrderExpandPanel
                                                    orderId={order.id}
                                                    onDraftCancelled={onDraftCancelled}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
