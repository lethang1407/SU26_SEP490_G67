import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, History, RotateCcw, Eye, Printer } from 'lucide-react';
import { useSalesOrderHistory } from '../hooks/useSalesOrderHistory';
import { printInvoice } from '../utils/printInvoice';
import { getInvoiceData } from '../api';
import OrderStatusBadge from './OrderStatusBadge';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import DebtBadge from './DebtBadge';
import { formatVnDateTime, formatCustomerName, formatPaymentMethod } from '../utils/orderDisplay';
import { formatVnd } from '../utils/money';
import '../../../css/SalesOrderHistoryModal.css';

const DATE_FILTERS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày qua' },
    { key: 'custom', label: 'Tùy chỉnh' },
];

export default function SalesOrderHistoryModal({ onClose, onExchange, mode = 'exchange' }) {
    const navigate = useNavigate();
    const isHistoryMode = mode === 'history';
    const {
        orders, total, totalPages, page, setPage,
        search, setSearch,
        dateFilter, setDateFilter,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        resetFilters,
        loading, error,
    } = useSalesOrderHistory();

    const searchRef = useRef(null);
    useEffect(() => { searchRef.current?.focus(); }, []);
    const [searchInput, setSearchInput] = useState(search);
    const searchTimerRef = useRef(null);
    useEffect(() => () => clearTimeout(searchTimerRef.current), []);

    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setSearch(value), 300);
    };

    const handleResetFilters = () => {
        clearTimeout(searchTimerRef.current);
        setSearchInput('');
        resetFilters();
    };

    const [detailOrderId, setDetailOrderId] = useState(null);
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && !detailOrderId) onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, detailOrderId]);

    const handlePrintInvoice = async (orderId) => {
        try {
            const data = await getInvoiceData(orderId);
            printInvoice(data);
        } catch (error) {
            console.error("Failed to load invoice for printing:", error);
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

    const handlePickOrder = (orderId) => (
        isHistoryMode ? setDetailOrderId(orderId) : handleExchange(orderId)
    );

    // Mã HĐ, thời gian, khách, tổng tiền, hình thức, [trạng thái], hành động
    const colCount = isHistoryMode ? 7 : 6;

    const pageNumbers = [];
    const maxPages = Math.min(totalPages, 10);
    for (let i = 0; i < maxPages; i++) pageNumbers.push(i);

    return (
        <>
            <div className="hist-overlay" onClick={onClose}>
                <div className="hist-modal" onClick={(e) => e.stopPropagation()}>

                    {/* Modal Header */}
                    <div className="hist-header">
                        <div className="hist-header-title">
                            <span className="hist-header-icon"><History size={22} /></span>
                            <div>
                                <div className="hist-title">
                                    {isHistoryMode ? 'Lịch sử đơn hàng' : 'Chọn hóa đơn để trả/đổi hàng'}
                                </div>
                                <div className="hist-subtitle">
                                    {isHistoryMode
                                        ? 'Tra cứu các hóa đơn đã thực hiện'
                                        : 'Chọn hóa đơn khách cần trả lại hoặc đổi sang hàng khác'}
                                </div>
                            </div>
                        </div>
                        <button className="hist-close-btn" onClick={onClose} title="Đóng">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Toolbar: 1 ô tìm kiếm cho mọi tiêu chí + lọc thời gian */}
                    <div className="hist-toolbar">
                        <div className="hist-search-wrap">
                            <Search className="hist-search-icon" size={16} />
                            <input
                                ref={searchRef}
                                className="hist-search-input"
                                placeholder="Tìm mã hóa đơn, khách hàng, số điện thoại, mã hoặc tên sản phẩm"
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>

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
                        {/* 
                        <button className="hist-reset-btn" onClick={handleResetFilters} title="Xóa bộ lọc">
                            <RotateCcw size={14} />
                            Xóa bộ lọc
                        </button> */}

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

                    {/* Body */}
                    <div className="hist-body">
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
                                            <th>Hình thức</th>
                                            {isHistoryMode && <th>Trạng thái</th>}
                                            <th className="hist-col-action"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr>
                                                <td colSpan={colCount} className="hist-empty">Đang tải...</td>
                                            </tr>
                                        )}
                                        {!loading && orders.length === 0 && (
                                            <tr>
                                                <td colSpan={colCount} className="hist-empty">Không có đơn hàng nào</td>
                                            </tr>
                                        )}
                                        {!loading && orders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className="hist-row hist-row-clickable"
                                                onClick={() => handlePickOrder(order.id)}
                                            >
                                                <td>
                                                    <span className="hist-order-code">
                                                        {order.orderCode ?? `#${order.id}`}
                                                    </span>
                                                </td>
                                                <td className="hist-time">
                                                    {formatVnDateTime(order.createdAt)}
                                                </td>
                                                <td>{formatCustomerName(order)}</td>
                                                <td className="text-right hist-amount">
                                                    {formatVnd(order.totalAmount)}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const { label, tone } = formatPaymentMethod(order.paymentMethod);
                                                        return (
                                                            <span className={`hist-badge badge-pay-${tone}`}>{label}</span>
                                                        );
                                                    })()}
                                                </td>
                                                {isHistoryMode && (
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
                                                )}
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <div className="hist-actions">
                                                        {isHistoryMode ? (
                                                            <>
                                                                <button
                                                                    className="hist-action-btn"
                                                                    title="Xem chi tiết hóa đơn"
                                                                    onClick={() => setDetailOrderId(order.id)}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    className="hist-action-btn"
                                                                    title="In lại hóa đơn"
                                                                    onClick={() => handlePrintInvoice(order.id)}
                                                                >
                                                                    <Printer size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="hist-exchange-btn"
                                                                onClick={() => handleExchange(order.id)}
                                                            >
                                                                Chọn
                                                            </button>
                                                        )}
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

            {detailOrderId != null && (
                <SalesOrderDetailModal
                    key={detailOrderId}
                    orderId={detailOrderId}
                    onClose={() => setDetailOrderId(null)}
                />
            )}
        </>
    );
}
