import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, ClipboardList } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SalesOrderStatusBadge from '../components/SalesOrderStatusBadge';
import SalesOrderPaymentSummary from '../components/SalesOrderPaymentSummary';
import SalesOrderItemsTable from '../components/SalesOrderItemsTable';
import { useSalesOrderDetail } from '../hooks/useSalesOrderDetail';
import { getInvoiceData } from '../api';
import { printInvoice } from '../../pos-screen/utils/printInvoice';
import { formatDateTime } from '../utils/salesOrderUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/SalesOrder.css';

export default function SalesOrderDetailPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { order, loading, error } = useSalesOrderDetail(orderId);

    const handlePrint = async () => {
        try {
            const invoice = await getInvoiceData(orderId);
            printInvoice(invoice);
        } catch {
            alert('Không thể tải hóa đơn để in.');
        }
    };

    const isCancelled = String(order?.orderStatus || '').toUpperCase() === 'CANCELLED';

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page sales-order-page">
                        <button
                            type="button"
                            className="sales-order-detail__back"
                            onClick={() => navigate('/admin/orders')}
                        >
                            <ArrowLeft size={18} />
                            Quay lại danh sách
                        </button>

                        {loading && (
                            <div className="supplier-table-card supplier-table-card--empty">
                                <p>Đang tải chi tiết đơn hàng...</p>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="supplier-table-card supplier-table-card--empty">
                                <p className="sales-order-error">{error}</p>
                            </div>
                        )}

                        {!loading && !error && order && (
                            <>
                                <header className="sales-order-detail__header">
                                    <div>
                                        <div className="sales-order-detail__title-row">
                                            <h1 className="supplier-page__title">
                                                {order.orderCode ?? `#${order.id}`}
                                            </h1>
                                            <SalesOrderStatusBadge
                                                status={order.orderStatus}
                                                isDebt={order.isDebt}
                                            />
                                        </div>
                                        <p className="supplier-page__subtitle">
                                            {formatDateTime(order.createdAt)}
                                            {' · '}
                                            Thu ngân: {order.cashierName || '—'}
                                        </p>
                                    </div>
                                    <div className="sales-order-detail__actions">
                                        <button
                                            type="button"
                                            className="supplier-btn supplier-btn--secondary"
                                            onClick={handlePrint}
                                            disabled={isCancelled}
                                        >
                                            <Printer size={18} />
                                            In hóa đơn
                                        </button>
                                        <button
                                            type="button"
                                            className="supplier-btn supplier-btn--primary"
                                            disabled={isCancelled}
                                            onClick={() =>
                                                navigate(`/admin/exchange-order/${order.id}`)
                                            }
                                        >
                                            <ClipboardList size={18} />
                                            Đổi trả
                                        </button>
                                    </div>
                                </header>

                                <div className="sales-order-detail__grid">
                                    <div className="sales-order-detail__panel">
                                        <h3 className="sales-order-detail__panel-title">Khách hàng</h3>
                                        {order.customer ? (
                                            <dl className="sales-order-detail__dl">
                                                <div>
                                                    <dt>Họ tên</dt>
                                                    <dd>
                                                        <Link to={`/admin/customer/${order.customer.id}`}>
                                                            {order.customer.fullName}
                                                        </Link>
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Số điện thoại</dt>
                                                    <dd>{order.customer.phoneNumber || '—'}</dd>
                                                </div>
                                            </dl>
                                        ) : (
                                            <p className="sales-order-detail__walk-in">Khách lẻ</p>
                                        )}
                                        {order.note ? (
                                            <div className="sales-order-detail__note">
                                                <strong>Ghi chú:</strong> {order.note}
                                            </div>
                                        ) : null}
                                    </div>

                                    <SalesOrderPaymentSummary order={order} />
                                </div>

                                <section className="sales-order-detail__items">
                                    <h2 className="sales-order-detail__section-title">Sản phẩm</h2>
                                    <SalesOrderItemsTable items={order.items ?? []} />
                                </section>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
