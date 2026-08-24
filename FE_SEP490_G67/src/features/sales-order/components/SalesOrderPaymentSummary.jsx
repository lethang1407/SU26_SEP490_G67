import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/salesOrderUtils';

export default function SalesOrderPaymentSummary({ order }) {
    if (!order) return null;

    const isDebt = Boolean(order.isDebt);

    return (
        <div className="sales-order-detail__panel">
            <h3 className="sales-order-detail__panel-title">Thanh toán</h3>
            <dl className="sales-order-detail__dl">
                <div>
                    <dt>Phương thức</dt>
                    <dd>
                        {order.paymentMethod === 'CASH' && 'Tiền mặt'}
                        {order.paymentMethod === 'TRANSFER' && 'Chuyển khoản'}
                        {order.paymentMethod === 'DEBT' && 'Ghi nợ'}
                        {!['CASH', 'TRANSFER', 'DEBT'].includes(order.paymentMethod) &&
                            (order.paymentMethod || '—')}
                    </dd>
                </div>
                <div>
                    <dt>Tạm tính</dt>
                    <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                <div>
                    <dt>Giảm giá</dt>
                    <dd>{formatCurrency(order.discountAmount)}</dd>
                </div>
                <div>
                    <dt>Tổng cộng</dt>
                    <dd className="sales-order-detail__total">{formatCurrency(order.totalAmount)}</dd>
                </div>
                <div>
                    <dt>Đã thanh toán</dt>
                    <dd>{formatCurrency(order.paidAmount)}</dd>
                </div>
                {isDebt && (
                    <>
                        <div>
                            <dt>Còn nợ</dt>
                            <dd className="sales-order-detail__debt">
                                {formatCurrency(order.remainingDebt)}
                            </dd>
                        </div>
                        <div>
                            <dt>Hạn nợ</dt>
                            <dd>{formatDate(order.dueDate)}</dd>
                        </div>
                    </>
                )}
            </dl>
            {order.customer?.id ? (
                <Link
                    className="sales-order-detail__customer-link"
                    to={`/admin/customer/${order.customer.id}`}
                >
                    Xem hồ sơ khách hàng
                </Link>
            ) : null}
        </div>
    );
}
