import { Link } from 'react-router-dom';
import { ORDER_STATUS_LABEL } from '../constants';
import { formatCurrency, formatDateTime } from '../utils/importOrderUtils';

export default function ImportOrderTable({ items, loading }) {
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
                            <th>Thời gian</th>
                            <th>Mã NCC</th>
                            <th>Nhà cung cấp</th>
                            <th>Cần trả NCC</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((order) => {
                            const amountDue = Number(order.remainingDebt ?? order.amountDue) || 0;
                            const receivedAt = order.receivedAt || order.receivedDate;

                            return (
                                <tr key={order.id}>
                                    <td className="supplier-table__code-text">{order.orderCode}</td>
                                    <td className="supplier-table__nowrap">{formatDateTime(receivedAt)}</td>
                                    <td>
                                        {order.supplierId ? (
                                            <Link
                                                to={`/admin/warehouse/supplier/${order.supplierId}`}
                                                className="import-order-table__supplier-code"
                                                title={`Xem nhà cung cấp ${order.supplierName}`}
                                            >
                                                {order.supplierCode}
                                            </Link>
                                        ) : (
                                            order.supplierCode
                                        )}
                                    </td>
                                    <td className="supplier-table__name" title={order.supplierName}>
                                        {order.supplierName}
                                    </td>
                                    <td
                                        className={`supplier-table__debt ${
                                            amountDue > 0 ? 'supplier-table__debt--highlight' : ''
                                        }`}
                                    >
                                        {formatCurrency(amountDue)}
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
