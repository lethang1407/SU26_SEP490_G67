import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Eye, ClipboardList, History, RotateCcw } from 'lucide-react';
import { useSalesOrderHistory } from '../hooks/useSalesOrderHistory';
import { printInvoice } from '../utils/printInvoice';
import OrderStatusBadge from './OrderStatusBadge';
import DebtBadge from './DebtBadge';
import { formatVnDateTime, formatCustomerLabel } from '../utils/orderDisplay';
import { getInvoiceData } from '../api';
import '../../../css/SalesOrderHistoryModal.css';

const DATE_FILTERS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày qua' },
    { key: 'custom', label: 'Tùy chỉnh' },
];

export default function SalesOrderHistoryModal({ onClose, onExchange }) {
    const navigate = useNavigate();
    const {
        orders, total, totalPages, page, setPage,
        orderCode, setOrderCode,
        customer, setCustomer,
        product, setProduct,
        dateFilter, setDateFilter,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        resetFilters,
        loading, error,
    } = useSalesOrderHistory();

    const searchRef = useRef(null);
    useEffect(() => { searchRef.current?.focus(); }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleViewInvoice = async (orderId) => {
        try {
            const data = await getInvoiceData(orderId);
            printInvoice(data);
        } catch {
            alert('Không thể tải hóa đơn.');
        }
    };

    const handleExchange = (orderId) => {
        if (onExchange) {
            onExchange(orderId);
            return;
        }
        onClose();
        navigate(`/admin/exchange-order/${orderId}`);
    };

    const pageNumbers = [];
    const maxPages = Math.min(totalPages, 10);
    for (let i = 0; i < maxPages; i++) pageNumbers.push(i);

    return (
        <div className="hist-overlay" onClick={onClose}>
            <div className="hist-modal" onClick={(e) => e.stopPropagation()}>

                {/* ── Modal Header ── */}
                <div className="hist-header">
                    <div className="hist-header-title">
                        <span className="hist-header-icon"><History size={22} /></span>
                        <div>
                            <div className="hist-title">Lịch sử bán hàng gần đây</div>
                            <div className="hist-subtitle">Tra cứu và quản lý các hóa đơn đã thực hiện</div>
                        </div>
                    </div>
                    <button className="hist-close-btn" onClick={onClose} title="Đóng">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="hist-body">

                    {/* ── Cột trái: bộ lọc tìm kiếm ── */}
                    <aside className="hist-search-panel">
                        <div className="hist-panel-title">
                            <Search size={15} />
                            Tìm kiếm
                        </div>

                        <label className="hist-field">
                            <span className="hist-field-label">Mã hóa đơn</span>
                            <input
                                ref={searchRef}
                                className="hist-field-input"
                                placeholder="VD: HD000123"
                                value={orderCode}
                                onChange={(e) => setOrderCode(e.target.value)}
                            />
                        </label>

                        <label className="hist-field">
                            <span className="hist-field-label">Khách hàng</span>
                            <input
                                className="hist-field-input"
                                placeholder="Tên hoặc số điện thoại"
                                value={customer}
                                onChange={(e) => setCustomer(e.target.value)}
                            />
                        </label>

                        <label className="hist-field">
                            <span className="hist-field-label">Sản phẩm</span>
                            <input
                                className="hist-field-input"
                                placeholder="Tên hoặc mã vạch sản phẩm"
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                            />
                        </label>

                        <div className="hist-field">
                            <span className="hist-field-label">Thời gian</span>
                            <div className="hist-date-pills">
                                {DATE_FILTERS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        className={`hist-pill ${dateFilter === key ? 'active' : ''}`}
                                        onClick={() => setDateFilter(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {dateFilter === 'custom' && (
                                <div className="hist-custom-dates">
                                    <input
                                        type="date"
                                        className="hist-date-input"
                                        value={customFrom}
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                    />
                                    <span>-</span>
                                    <input
                                        type="date"
                                        className="hist-date-input"
                                        value={customTo}
                                        onChange={(e) => setCustomTo(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <button className="hist-reset-btn" onClick={resetFilters}>
                            <RotateCcw size={14} />
                            Xóa bộ lọc
                        </button>
                    </aside>

                    {/* ── Cột phải: danh sách hóa đơn ── */}
                    <section className="hist-result-panel">
                        <div className="hist-table-wrap">
                            {error && <div className="hist-error">{error}</div>}

                            <table className="hist-table">
                                <thead>
                                    <tr>
                                        <th>Mã hóa đơn</th>
                                        <th>Thời gian</th>
                                        <th>Khách hàng</th>
                                        <th className="text-right">Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && (
                                        <tr>
                                            <td colSpan={6} className="hist-empty">Đang tải...</td>
                                        </tr>
                                    )}
                                    {!loading && orders.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="hist-empty">Không có đơn hàng nào</td>
                                        </tr>
                                    )}
                                    {!loading && orders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="hist-row hist-row-clickable"
                                            onClick={() => handleExchange(order.id)}
                                        >
                                            <td>
                                                {/* Trả toàn bộ: mã phiếu trả (HDT) là mã chính, mã bán gốc hiển thị phụ */}
                                                {order.returnCode && order.orderStatus === 'RETURNED' ? (
                                                    <>
                                                        <span className="hist-order-code">
                                                            {order.returnCode}
                                                        </span>
                                                        <div className="hist-order-code-sub">
                                                            HĐ gốc: {order.orderCode ?? `#${order.id}`}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="hist-order-code">
                                                            {order.orderCode ?? `#${order.id}`}
                                                        </span>
                                                        {order.returnCode && (
                                                            <div className="hist-order-code-sub">
                                                                Phiếu trả: {order.returnCode}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                            <td className="hist-time">
                                                {formatVnDateTime(order.createdAt)}
                                            </td>
                                            <td>{formatCustomerLabel(order)}</td>
                                            <td className="text-right hist-amount">
                                                {Number(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                                            </td>
                                            <td>
                                                <div className="hist-badge-group">
                                                    <OrderStatusBadge status={order.orderStatus} />
                                                    <DebtBadge
                                                        debtStatus={order.debtStatus}
                                                        remainingDebt={order.remainingDebt}
                                                        dueDate={order.dueDate}
                                                    />
                                                </div>
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="hist-actions">
                                                    <button
                                                        className="hist-action-btn"
                                                        title="Xem hóa đơn"
                                                        onClick={() => handleViewInvoice(order.id)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="hist-exchange-btn"
                                                        onClick={() => handleExchange(order.id)}
                                                    >
                                                        <ClipboardList size={14} />
                                                        Đổi/trả hàng
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Footer: count + pagination ── */}
                        <div className="hist-footer">
                            <span className="hist-count">
                                Hiển thị {orders.length} trên {total} hóa đơn
                            </span>

                            {totalPages > 1 && (
                                <div className="hist-pagination">
                                    <button
                                        className="hist-page-btn"
                                        disabled={page === 0}
                                        onClick={() => setPage(page - 1)}
                                    ></button>

                                    {pageNumbers.map((p) => (
                                        <button
                                            key={p}
                                            className={`hist-page-btn ${p === page ? 'active' : ''}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p + 1}
                                        </button>
                                    ))}

                                    <button
                                        className="hist-page-btn"
                                        disabled={page >= totalPages - 1}
                                        onClick={() => setPage(page + 1)}
                                    ></button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
