import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Home, ClipboardList } from 'lucide-react';
import { useSalesOrderHistory } from '../hooks/useSalesOrderHistory';
import OrderStatusBadge from './OrderStatusBadge';
import { formatVnDateTime, formatCustomerLabel } from '../utils/orderDisplay';
import { formatVnd } from '../utils/money';
import '../../../css/POS.css';
import '../../../css/SalesOrderHistoryModal.css';
import '../../../css/ExchangeOrder.css';

const DATE_FILTERS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: '7days', label: '7 ngày qua' },
    { key: 'custom', label: 'Tùy chỉnh' },
];

/** Bước chọn hóa đơn cần đổi/trả */
export default function ExchangeOrderPicker() {
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

    const pageNumbers = [];
    const maxPages = Math.min(totalPages, 10);
    for (let i = 0; i < maxPages; i++) pageNumbers.push(i);

    return (
        <div className="pos-container">
            <header className="pos-header">
                <div className="pos-header-left">
                    <div className="pos-header-center">
                        <button className="tab-active">Đổi trả hàng</button>
                    </div>
                </div>
                <div className="pos-header-right">
                    <button className="icon-btn" onClick={() => navigate('/admin/pos')} title="Quay lại POS">
                        <Home size={24} />
                    </button>
                </div>
            </header>

            <div className="exchange-picker-main">
                <div className="exchange-picker-card">

                    <div className="hist-header">
                        <div className="hist-header-title">
                            <span className="hist-header-icon"><ClipboardList size={22} /></span>
                            <div>
                                <div className="hist-title">Chọn hóa đơn cần đổi/trả</div>
                                <div className="hist-subtitle">
                                    Tìm hóa đơn khách đã mua để bắt đầu đổi hoặc trả hàng
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Toolbar ── */}
                    <div className="hist-toolbar">
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
                                    <tr
                                        key={order.id}
                                        className="hist-row exchange-picker-row"
                                        onClick={() => navigate(`/admin/exchange-order/${order.id}`)}
                                    >
                                        <td>
                                            <span className="hist-order-code">
                                                {order.orderCode ?? `#${order.id}`}
                                            </span>
                                        </td>
                                        <td className="hist-time">{formatVnDateTime(order.createdAt)}</td>
                                        <td>{formatCustomerLabel(order)}</td>
                                        <td className="text-right hist-amount">
                                            {formatVnd(order.totalAmount)}
                                        </td>
                                        <td>
                                            <OrderStatusBadge status={order.orderStatus} />
                                        </td>
                                        <td>
                                            <div className="hist-actions">
                                                <button className="hist-action-btn" title="Đổi/trả hóa đơn này">
                                                    <ChevronRight size={16} />
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
                                    title="Trang trước"
                                >
                                    <ChevronLeft size={16} />
                                </button>

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
                                    title="Trang sau"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
