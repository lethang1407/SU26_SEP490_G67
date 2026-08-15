import { useNavigate } from 'react-router-dom';
import { Eye, Printer } from 'lucide-react';
import SalesOrderStatusBadge from './SalesOrderStatusBadge';
import { formatCurrency, formatDateTime, getPaymentLabel } from '../utils/salesOrderUtils';

export default function SalesOrderTable({ items, loading, error, onPrint }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Đang tải danh sách đơn hàng...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p className="sales-order-error">{error}</p>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Không tìm thấy đơn hàng phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table sales-order-table">
                    <thead>
                        <tr>
                            <th>Mã hóa đơn</th>
                            <th>Thời gian</th>
                            <th>Khách hàng</th>
                            <th>Thu ngân</th>
                            <th className="text-right">Tổng tiền</th>
                            <th>Thanh toán</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((order) => (
                            <tr
                                key={order.id}
                                className="sales-order-table__row"
                                onClick={() => navigate(`/admin/orders/${order.id}`)}
                            >
                                <td>
                                    <span className="sales-order-table__code">
                                        {order.orderCode ?? `#${order.id}`}
                                    </span>
                                </td>
                                <td className="supplier-table__nowrap">
                                    {formatDateTime(order.createdAt)}
                                </td>
                                <td className="supplier-table__name" title={order.customerName || 'Khách lẻ'}>
                                    {order.customerName || 'Khách lẻ'}
                                </td>
                                <td>{order.staffName || '—'}</td>
                                <td className="text-right supplier-table__debt">
                                    {formatCurrency(order.totalAmount)}
                                </td>
                                <td>{getPaymentLabel(order.paymentMethod)}</td>
                                <td>
                                    <SalesOrderStatusBadge
                                        status={order.orderStatus}
                                        isDebt={order.isDebt}
                                    />
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <div className="sales-order-table__actions">
                                        <button
                                            type="button"
                                            className="sales-order-action-btn"
                                            title="Xem chi tiết"
                                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="sales-order-action-btn"
                                            title="In hóa đơn"
                                            onClick={() => onPrint?.(order.id)}
                                        >
                                            <Printer size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
