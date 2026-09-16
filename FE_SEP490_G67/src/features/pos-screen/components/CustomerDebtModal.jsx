import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, HandCoins, LoaderCircle, Search, WifiOff, X } from 'lucide-react';
import { getCustomerDebts } from '../api';
import { formatVnd } from '../utils/money';
import '../../../css/SalesOrderHistoryModal.css';
import CustomerDebtOrdersModal from './CustomerDebtOrdersModal';
import CreatePaymentModal from '../../customer/components/CreatePaymentModal';
import { getOfflineCustomerDebts, saveOfflineCustomers } from '@/lib/db';

const PAGE_SIZE = 10;

function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function getFilterValue(value) {
    return value === '' ? undefined : value;
}

export default function CustomerDebtModal({ onClose }) {
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [allowDebt, setAllowDebt] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const sortBy = 'debtPriorityLatest';
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [paymentCustomer, setPaymentCustomer] = useState(null);
    const searchTimerRef = useRef(null);

    useEffect(() => () => clearTimeout(searchTimerRef.current), []);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Check offline state first
        if (typeof window !== 'undefined' && !window.navigator.onLine) {
            try {
                const offResult = await getOfflineCustomerDebts({
                    keyword: keyword || undefined,
                    status: getFilterValue(status),
                    allowDebt: getFilterValue(allowDebt),
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    page: Math.max(1, page),
                    size: PAGE_SIZE,
                });
                setData(offResult);
                setIsOfflineData(true);
            } catch (offErr) {
                console.warn('Failed to fetch offline customer debts:', offErr);
                setError('Không thể tải danh sách công nợ từ bộ nhớ.');
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const result = await getCustomerDebts({
                keyword: keyword || undefined,
                status: getFilterValue(status),
                allowDebt: getFilterValue(allowDebt),
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                sortBy,
                page: Math.max(1, page),
                size: PAGE_SIZE,
            });
            setData({
                content: result?.content ?? [],
                totalElements: result?.totalElements ?? 0,
                totalPages: result?.totalPages ?? 0,
            });
            setIsOfflineData(false);
            if (Array.isArray(result?.content) && result.content.length > 0) {
                saveOfflineCustomers(result.content).catch(err => {
                    console.warn('Failed to cache customer debts:', err);
                });
            }
        } catch (requestError) {
            console.error('Failed to fetch customer debts, trying offline fallback:', requestError);
            try {
                const offResult = await getOfflineCustomerDebts({
                    keyword: keyword || undefined,
                    status: getFilterValue(status),
                    allowDebt: getFilterValue(allowDebt),
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    page: Math.max(1, page),
                    size: PAGE_SIZE,
                });
                setData(offResult);
                setIsOfflineData(true);
                setError(null);
            } catch (offErr) {
                console.warn('Offline fallback also failed:', offErr);
                setError('Không thể tải danh sách công nợ.');
            }
        } finally {
            setLoading(false);
        }
    }, [allowDebt, fromDate, keyword, page, sortBy, status, toDate]);

    useEffect(() => {
        // Fetching remote data updates the loading/result state when the request resolves.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCustomers();
    }, [fetchCustomers]);

    const updateFilter = (setter) => (event) => {
        setter(event.target.value);
        setPage(1);
    };

    const handleKeywordChange = (value) => {
        setKeywordInput(value);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setKeyword(value.trim());
            setPage(1);
        }, 300);
    };

    const clearFilters = () => {
        clearTimeout(searchTimerRef.current);
        setKeywordInput('');
        setKeyword('');
        setStatus('');
        setAllowDebt('');
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    const handlePaymentSuccess = () => {
        setPaymentCustomer(null);
        fetchCustomers();
    };

    const totalPages = Math.max(1, data.totalPages);
    const customers = data.content;

    return (
        <div className="hist-overlay" onClick={onClose}>
            <div className="hist-modal customer-debt-modal" onClick={(event) => event.stopPropagation()}>
                <div className="hist-header">
                    <div className="hist-header-title">
                        <span className="hist-header-icon"><HandCoins size={22} /></span>
                        <div>
                            <div className="hist-title">Công nợ khách hàng</div>
                            <div className="hist-subtitle">Danh sách khách hàng và tình trạng công nợ</div>
                        </div>
                    </div>
                    <button className="hist-close-btn" onClick={onClose} title="Đóng">
                        <X size={20} />
                    </button>
                </div>

                {isOfflineData && (
                    <div style={{
                        padding: '6px 16px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderBottom: '1px solid #fde68a'
                    }}>
                        <WifiOff size={14} />
                        <span>Chế độ ngoại tuyến: Dữ liệu công nợ được nạp từ bộ nhớ máy</span>
                    </div>
                )}

                <div className="hist-toolbar customer-debt-filters">
                    <div className="hist-search-wrap customer-debt-search">
                        <Search className="hist-search-icon" size={16} />
                        <input
                            className="hist-search-input"
                            value={keywordInput}
                            onChange={(event) => handleKeywordChange(event.target.value)}
                            placeholder="Tìm theo tên hoặc số điện thoại"
                            autoFocus
                        />
                    </div>
                    <select className="customer-debt-select" value={status} onChange={updateFilter(setStatus)} aria-label="Trạng thái nợ">
                        <option value="">Tất cả trạng thái</option>
                        <option value="IN_DEBT">Đang nợ</option>
                        <option value="OVERDUE">Nợ lâu</option>
                        <option value="NO_DEBT">Không nợ</option>
                    </select>
                    <select className="customer-debt-select" value={allowDebt} onChange={updateFilter(setAllowDebt)} aria-label="Quyền cho nợ">
                        <option value="">Tất cả quyền nợ</option>
                        <option value="true">Được phép nợ</option>
                        <option value="false">Không được phép nợ</option>
                    </select>
                    <div className="customer-debt-date-filters">
                        <input type="date" value={fromDate} onChange={updateFilter(setFromDate)} aria-label="Từ ngày" />
                        <span>-</span>
                        <input type="date" value={toDate} onChange={updateFilter(setToDate)} aria-label="Đến ngày" />
                    </div>
                    <button className="hist-reset-btn customer-debt-reset" onClick={clearFilters}>Xóa lọc</button>
                </div>

                <div className="hist-body">
                    {error && (
                        <div className="hist-error customer-debt-error">
                            <AlertCircle size={17} /> {error}
                        </div>
                    )}
                    <div className="hist-result-panel">
                    <div className="hist-table-wrap customer-debt-table-wrap">
                        <table className="hist-table customer-debt-table">
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>Liên hệ</th>
                                    <th>Trạng thái</th>
                                    <th className="text-right">Tổng nợ</th>
                                    <th>Đơn nợ</th>
                                    <th>Đơn nợ gần nhất</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan="7" className="hist-empty customer-debt-empty"><LoaderCircle className="customer-debt-spinner" size={18} /> Đang tải...</td></tr>
                                )}
                                {!loading && customers.length === 0 && (
                                    <tr><td colSpan="7" className="hist-empty customer-debt-empty">Không có khách hàng phù hợp.</td></tr>
                                )}
                                {!loading && customers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className={customer.allowDebt === false
                                            ? 'customer-debt-row--denied'
                                            : customer.isCheckDebtUnstable
                                                ? 'customer-debt-row--unstable'
                                                : undefined}
                                    >
                                        <td>
                                            <strong>{customer.fullName || 'Chưa cập nhật'}</strong>
                                            {customer.note && <small>{customer.note}</small>}
                                        </td>
                                        <td>{customer.phoneNumber || '-'}</td>
                                        <td>
                                            <span className={`customer-debt-status customer-debt-status--${(customer.debtStatus || 'NO_DEBT').toLowerCase()}`}>
                                                {customer.debtStatus === 'OVERDUE' ? 'Nợ lâu'
                                                    : customer.debtStatus === 'IN_DEBT' ? 'Đang nợ' : 'Không nợ'}
                                            </span>
                                        </td>
                                        <td className="text-right customer-debt-amount">{formatVnd(customer.totalDebt)}</td>
                                        <td>{customer.totalOrdersInDebt ?? 0}</td>
                                        <td>{formatDate(customer.latestDebtDate)}</td>
                                        <td className="customer-debt-action-cell">
                                            <button
                                                className="hist-action-btn"
                                                title="Xem chi tiết đơn nợ"
                                                aria-label={`Xem chi tiết đơn nợ của ${customer.fullName || 'khách hàng'}`}
                                                onClick={() => setSelectedCustomer(customer)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="hist-action-btn customer-debt-payment-btn"
                                                title="Thu nợ khách hàng"
                                                aria-label={`Thu nợ của ${customer.fullName || 'khách hàng'}`}
                                                disabled={!customer.totalDebt || Number(customer.totalDebt) <= 0}
                                                onClick={() => setPaymentCustomer(customer)}
                                            >
                                                <HandCoins size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {paymentCustomer && (
                        <CreatePaymentModal
                            show
                            customer={paymentCustomer}
                            onHide={() => setPaymentCustomer(null)}
                            onSuccess={handlePaymentSuccess}
                        />
                    )}
                    {selectedCustomer && (
                        <CustomerDebtOrdersModal
                            customer={selectedCustomer}
                            onClose={() => setSelectedCustomer(null)}
                        />
                    )}
                    </div>
                    </div>

                <div className="hist-footer">
                    <span className="hist-count">Hiển thị {customers.length} trên {data.totalElements} khách hàng</span>
                    <div className="hist-pagination customer-debt-pagination">
                        <button className="hist-page-btn" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
                        <span>Trang {page} / {totalPages}</span>
                        <button className="hist-page-btn" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>›</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
