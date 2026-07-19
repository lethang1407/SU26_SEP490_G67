import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Eye, ClipboardList, History } from 'lucide-react';
import { useSalesOrderHistory } from '../hooks/useSalesOrderHistory';
import { printInvoice } from '../utils/printInvoice';
import { getInvoiceData } from '../api';
import '../../../css/SalesOrderHistoryModal.css';

const DATE_FILTERS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày qua' },
    { key: 'custom', label: 'Tùy chỉnh' },
];

const STATUS_CONFIG = {
    COMPLETED: { label: 'Hoàn thành', cls: 'badge-completed' },
    CANCELLED: { label: 'Đã hủy', cls: 'badge-cancelled' },
    RETURNED: { label: 'Trả hàng', cls: 'badge-returned' },
    DEBT: { label: 'Bán nợ', cls: 'badge-debt' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'badge-default' };
    return <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function formatVnDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function SalesOrderHistoryModal({ onClose, onViewInvoice }) {
    const navigate = useNavigate();
    const {
        orders, total, totalPages, page, setPage,
        search, setSearch,
        dateFilter, setDateFilter,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
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

                {/* ── Toolbar ── */}
                <div className="hist-toolbar">
                    {/* Search */}
                    <div className="hist-search-wrap">
                        <Search size={15} className="hist-search-icon" />
                        <input
                            ref={searchRef}
                            className="hist-search-input"
                            placeholder="Tìm theo mã hóa đơn, tên khách hàng..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Date pills */}
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

                    {/* Custom date range */}
                    {dateFilter === 'custom' && (
                        <div className="hist-custom-dates">
                            <input
                                type="date"
                                className="hist-date-input"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                            />
                            <span>–</span>
                            <input
                                type="date"
                                className="hist-date-input"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* ── Table ── */}
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
                                <tr key={order.id} className="hist-row">
                                    <td>
                                        <span className="hist-order-code">
                                            {order.orderCode ?? `#${order.id}`}
                                        </span>
                                    </td>
                                    <td className="hist-time">
                                        {formatVnDateTime(order.createdAt)}
                                    </td>
                                    <td>{order.customerName ?? 'Khách lẻ'}</td>
                                    <td className="text-right hist-amount">
                                        {Number(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td>
                                        <StatusBadge status={order.orderStatus} />
                                    </td>
                                    <td>
                                        <div className="hist-actions">
                                            {/* View / print invoice */}
                                            <button
                                                className="hist-action-btn"
                                                title="Xem hóa đơn"
                                                onClick={() => handleViewInvoice(order.id)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {/* Clone to new order (future) */}
                                            <button
                                                className="hist-action-btn"
                                                title="Đổi trả hàng"
                                                onClick={() => navigate(`/admin/exchange-order/${order.id}`)}
                                            >
                                                <ClipboardList size={16} />
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
                            >‹</button>

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
                            >›</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
