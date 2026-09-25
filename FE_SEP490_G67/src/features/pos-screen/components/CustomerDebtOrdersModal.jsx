import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Eye, HandCoins, History, LoaderCircle, X } from 'lucide-react';
import { getCustomerDebtOrders, getCustomerDebtPaymentHistory } from '../api';
import { formatVnd } from '../utils/money';
import '../../../css/SalesOrderHistoryModal.css';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import { getOfflineDebtOrders, saveOfflineDebtOrders, db } from '@/lib/db';

const PAGE_SIZE = 10;

function formatDate(value, includeTime = false) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('vi-VN', includeTime
        ? { dateStyle: 'short', timeStyle: 'short' }
        : { dateStyle: 'short' }).format(new Date(value));
}

function getStatusLabel(status) {
    switch (status) {
        case 'PAID': return 'Đã thanh toán';
        case 'PARTIALLY_PAID': return 'Thanh toán một phần';
        case 'OVERDUE': return 'Quá hạn';
        case 'UNPAID':
        case 'IN_DEBT':
            return 'Đang nợ';
        default: return status || '-';
    }

}

function getPaymentMethodLabel(method) {
    if (method === 'CASH') return 'Tiền mặt';
    if (method === 'BANK') return 'Chuyển khoản';
    if (method === 'RETURN_OFFSET') return 'Đổi trả hàng';
    return method || '-';
}

export default function CustomerDebtOrdersModal({ customer, onClose }) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailOrderId, setDetailOrderId] = useState(null);
    const [activeTab, setActiveTab] = useState('orders');
    const [paymentPage, setPaymentPage] = useState(1);
    const [paymentData, setPaymentData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Check offline first
        if (typeof window !== 'undefined' && !window.navigator.onLine) {
            try {
                const offOrders = await getOfflineDebtOrders(customer.id);
                setData(offOrders);
            } catch (offErr) {
                console.warn('Failed to get offline debt orders:', offErr);
                setError('Không thể tải danh sách đơn nợ từ bộ nhớ.');
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const result = await getCustomerDebtOrders(customer.id, {
                page: Math.max(1, page),
                size: PAGE_SIZE,
            });
            const content = result?.content ?? [];
            setData({
                content,
                totalElements: result?.totalElements ?? 0,
                totalPages: result?.totalPages ?? 0,
            });
            if (content.length > 0) {
                saveOfflineDebtOrders(customer.id, content).catch(err => {
                    console.warn('Failed to cache debt orders:', err);
                });
            }
        } catch (requestError) {
            console.error('Failed to fetch customer debt orders, trying offline fallback:', requestError);
            try {
                const offOrders = await getOfflineDebtOrders(customer.id);
                setData(offOrders);
                setError(null);
            } catch (offErr) {
                console.warn('Offline debt orders fallback failed:', offErr);
                setError('Không thể tải danh sách đơn nợ của khách hàng.');
            }
        } finally {
            setLoading(false);
        }
    }, [customer.id, page]);

    useEffect(() => {
        // The request synchronizes the modal with the selected customer's remote debt orders.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const fetchPaymentHistory = useCallback(async () => {
        setPaymentLoading(true);
        setPaymentError(null);

        const getOfflinePendingPayments = async () => {
            try {
                const queueItems = await db.offline_queue
                    .filter(item => item.type === 'DEBT_PAYMENT' && (item.customer?.id === customer.id || item.orderSnapshot?.customerId === customer.id))
                    .toArray();
                return queueItems.map(item => ({
                    id: `off-${item.id}`,
                    paymentDate: item.createdAt,
                    paymentCode: item.orderSnapshot?.paymentCode || item.clientUuid,
                    orderCode: 'Phiếu thu ngoại tuyến',
                    amountPaid: item.payload?.amountPaid || item.orderSnapshot?.amountPaid || 0,
                    paymentMethod: item.payload?.paymentMethod || 'CASH',
                    staffName: 'Chờ đồng bộ',
                    note: item.payload?.note || item.orderSnapshot?.note || ''
                }));
            } catch (err) {
                console.warn('Failed to read offline queue for payments:', err);
                return [];
            }
        };

        if (typeof window !== 'undefined' && !window.navigator.onLine) {
            const pending = await getOfflinePendingPayments();
            setPaymentData({
                content: pending,
                totalElements: pending.length,
                totalPages: Math.max(1, Math.ceil(pending.length / PAGE_SIZE))
            });
            setPaymentLoading(false);
            return;
        }

        try {
            const result = await getCustomerDebtPaymentHistory(customer.id, {
                page: Math.max(1, paymentPage),
                size: PAGE_SIZE,
            });
            const pending = await getOfflinePendingPayments();
            const combinedContent = [...pending, ...(result?.content ?? [])];
            setPaymentData({
                content: combinedContent,
                totalElements: (result?.totalElements ?? 0) + pending.length,
                totalPages: result?.totalPages ?? 0,
            });
        } catch (requestError) {
            console.error('Failed to fetch customer debt payment history, falling back to offline queue:', requestError);
            const pending = await getOfflinePendingPayments();
            setPaymentData({
                content: pending,
                totalElements: pending.length,
                totalPages: Math.max(1, Math.ceil(pending.length / PAGE_SIZE))
            });
        } finally {
            setPaymentLoading(false);
        }
    }, [customer.id, paymentPage]);

    useEffect(() => {
        // Load payment history when its tab becomes active.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (activeTab === 'payments') fetchPaymentHistory();
    }, [activeTab, fetchPaymentHistory]);

    const totalPages = Math.max(1, data.totalPages);

    return (
        <div className="hist-overlay customer-debt-orders-overlay" onClick={onClose}>
            <div className="hist-modal customer-debt-orders-modal" onClick={(event) => event.stopPropagation()}>
                <div className="hist-header">
                    <div className="hist-header-title">
                        <span className="hist-header-icon"><Eye size={22} /></span>
                        <div>
                            <div className="hist-title">Chi tiết công nợ</div>
                            <div className="hist-subtitle">
                                Khách hàng: <b>{customer.fullName || 'Chưa cập nhật'}</b>
                            </div>
                        </div>
                    </div>
                    <button className="hist-close-btn" onClick={onClose} title="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <div className="customer-debt-detail-tabs">
                    <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
                        <HandCoins size={15} /> Danh sách đơn nợ
                    </button>
                    <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>
                        <History size={15} /> Lịch sử thu nợ
                    </button>
                </div>

                <div className="hist-body">
                    <div className="hist-result-panel">
                        {activeTab === 'orders' && error && (
                            <div className="hist-error customer-debt-error">
                                <AlertCircle size={17} /> {error}
                            </div>
                        )}
                        {activeTab === 'orders' ? <div className="hist-table-wrap">
                            <table className="hist-table customer-debt-orders-table">
                                <thead>
                                    <tr>
                                        <th>Ngày mua</th>
                                        <th>Mã hóa đơn</th>
                                        <th className="text-right">Tổng tiền</th>
                                        <th className="text-right">Còn nợ</th>
                                        <th>Hạn nợ</th>
                                        <th>Người bán</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && (
                                        <tr>
                                            <td colSpan="7" className="hist-empty">
                                                <LoaderCircle className="customer-debt-spinner" size={18} /> Đang tải...
                                            </td>
                                        </tr>
                                    )}
                                    {!loading && data.content.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="hist-empty">Không có đơn nợ nào.</td>
                                        </tr>
                                    )}
                                    {!loading && data.content.map((order) => (
                                        <tr key={order.id}>
                                            <td>{formatDate(order.orderDate, true)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="hist-order-code customer-debt-order-code"
                                                    title="Xem chi tiết hóa đơn"
                                                    onClick={() => setDetailOrderId(order.orderId)}
                                                >
                                                    {order.orderCode || `#${order.orderId}`}
                                                </button>
                                            </td>
                                            <td className="text-right">{formatVnd(order.totalAmount)}</td>
                                            <td className="text-right customer-debt-order-remaining">
                                                {formatVnd(order.amountRemaining)}
                                            </td>
                                            <td>{formatDate(order.dueDate)}</td>
                                            <td>{order.createdBy || '-'}</td>
                                            <td>
                                                <span className={`customer-debt-order-status customer-debt-order-status--${String(order.status || '').toLowerCase()}`}>
                                                    {getStatusLabel(order.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div> : (
                            <>
                                {paymentError && <div className="hist-error customer-debt-error"><AlertCircle size={17} /> {paymentError}</div>}
                                <div className="hist-table-wrap">
                                    <table className="hist-table customer-debt-payment-table">
                                        <thead><tr><th>Ngày thu</th><th>Mã phiếu thu</th><th>Hóa đơn liên quan</th><th className="text-right">Số tiền</th><th>Phương thức</th><th>Người thu</th><th>Ghi chú</th></tr></thead>
                                        <tbody>
                                            {paymentLoading && <tr><td colSpan="7" className="hist-empty"><LoaderCircle className="customer-debt-spinner" size={18} /> Đang tải...</td></tr>}
                                            {!paymentLoading && paymentData.content.length === 0 && <tr><td colSpan="7" className="hist-empty">Chưa có lịch sử thu nợ.</td></tr>}
                                            {!paymentLoading && paymentData.content.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td>{formatDate(payment.paymentDate, true)}</td>
                                                    <td>{payment.paymentCode || '-'}</td>
                                                    <td>
                                                        {payment.orderId ? (
                                                            <button
                                                                type="button"
                                                                className="hist-order-code customer-debt-order-code"
                                                                title="Xem chi tiết hóa đơn"
                                                                onClick={() => setDetailOrderId(payment.orderId)}
                                                            >
                                                                {payment.orderCode || `#${payment.orderId}`}
                                                            </button>
                                                        ) : payment.orderCode || '-'}
                                                    </td>
                                                    <td className="text-right customer-debt-payment-amount">{formatVnd(payment.amountPaid)}</td>
                                                    <td>{getPaymentMethodLabel(payment.paymentMethod)}</td>
                                                    <td>{payment.staffName || '-'}</td>
                                                    <td>{payment.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                        {detailOrderId != null && (
                            <SalesOrderDetailModal
                                orderId={detailOrderId}
                                allowDebtPayment
                                onClose={() => setDetailOrderId(null)}
                            />
                        )}
                    </div>
                </div>

                <div className="hist-footer">
                    <span className="hist-count">
                        {activeTab === 'orders'
                            ? `Hiển thị ${data.content.length} trên ${data.totalElements} đơn nợ`
                            : `Hiển thị ${paymentData.content.length} trên ${paymentData.totalElements} lượt thu`}
                    </span>
                    <div className="hist-pagination customer-debt-pagination">
                        <button
                            className="hist-page-btn"
                            disabled={(activeTab === 'orders' ? page : paymentPage) <= 1 || (activeTab === 'orders' ? loading : paymentLoading)}
                            onClick={() => activeTab === 'orders'
                                ? setPage((current) => Math.max(1, current - 1))
                                : setPaymentPage((current) => Math.max(1, current - 1))}
                        >
                            ‹
                        </button>
                        <span>Trang {activeTab === 'orders' ? page : paymentPage} / {Math.max(1, activeTab === 'orders' ? totalPages : paymentData.totalPages)}</span>
                        <button
                            className="hist-page-btn"
                            disabled={(activeTab === 'orders' ? page >= totalPages : paymentPage >= Math.max(1, paymentData.totalPages)) || (activeTab === 'orders' ? loading : paymentLoading)}
                            onClick={() => activeTab === 'orders'
                                ? setPage((current) => Math.min(totalPages, current + 1))
                                : setPaymentPage((current) => Math.min(Math.max(1, paymentData.totalPages), current + 1))}
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
