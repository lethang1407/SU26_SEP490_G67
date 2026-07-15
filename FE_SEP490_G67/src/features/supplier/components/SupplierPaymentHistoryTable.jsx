import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import SupplierPagination from './SupplierPagination';
import { PAYMENT_METHOD_LABEL } from '../constants/mockSupplierDetails';
import { formatCurrency, formatDateTime } from '../utils/supplierUtils';
import { suppliersApi } from '../api';

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_PAGE = { content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 1 };

export default function SupplierPaymentHistoryTable({ supplierId, onViewReference, refreshToken }) {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchPayments = useCallback(() => {
        if (!supplierId) return;
        setLoading(true);
        suppliersApi
            .getPaymentHistory(supplierId, {
                page: page - 1,
                size: PAGE_SIZE,
                search: debouncedKeyword,
                fromDate,
                toDate,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [supplierId, page, debouncedKeyword, fromDate, toDate]);

    // refreshToken không được dùng trong fetchPayments, chỉ là "tín hiệu" ép fetch lại
    // sau khi thanh toán nợ thành công ở nơi khác (SupplierDetailPage).
    useEffect(() => {
        fetchPayments();
    }, [fetchPayments, refreshToken]);

    const handleKeywordChange = (value) => {
        setKeyword(value);
    };

    const handleFromDateChange = (value) => {
        setFromDate(value);
        setPage(1);
    };

    const handleToDateChange = (value) => {
        setToDate(value);
        setPage(1);
    };

    const handleClearDateRange = () => {
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    const totalItems = data.totalElements ?? 0;
    const startIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <div className="supplier-import-history">
            <div className="supplier-toolbar supplier-toolbar--compact">
                <div className="supplier-toolbar__search">
                    <Search size={18} className="supplier-toolbar__search-icon" />
                    <input
                        type="text"
                        className="supplier-toolbar__search-input"
                        placeholder="Tìm theo mã giao dịch hoặc mã đơn hàng..."
                        value={keyword}
                        onChange={(event) => handleKeywordChange(event.target.value)}
                        aria-label="Tìm lịch sử thanh toán nợ"
                    />
                </div>

                <div className="supplier-toolbar__filters">
                    <span className="supplier-toolbar__filter-label">Thời gian:</span>
                    <div className="supplier-toolbar__date-range">
                        <input
                            type="date"
                            className="supplier-toolbar__date-input"
                            value={fromDate}
                            max={toDate || undefined}
                            onChange={(event) => handleFromDateChange(event.target.value)}
                            aria-label="Từ ngày"
                        />
                        <span className="supplier-toolbar__date-sep">—</span>
                        <input
                            type="date"
                            className="supplier-toolbar__date-input"
                            value={toDate}
                            min={fromDate || undefined}
                            onChange={(event) => handleToDateChange(event.target.value)}
                            aria-label="Đến ngày"
                        />
                        {(fromDate || toDate) && (
                            <button
                                type="button"
                                className="supplier-toolbar__date-clear"
                                onClick={handleClearDateRange}
                            >
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="supplier-table-card">
                <div className="supplier-table-wrapper">
                    <table className="supplier-table supplier-table--detail">
                        <thead>
                            <tr>
                                <th>Ngày giao dịch</th>
                                <th>Mã giao dịch</th>
                                <th>Mã đơn hàng</th>
                                <th>Số tiền thanh toán</th>
                                <th>Số tiền nợ còn lại</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="supplier-table__empty-row">
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : data.content.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="supplier-table__empty-row">
                                        Chưa có lịch sử thanh toán nợ.
                                    </td>
                                </tr>
                            ) : (
                                data.content.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="supplier-table__nowrap">{formatDateTime(payment.paymentDate)}</td>
                                        <td>{payment.paymentCode}</td>
                                        <td>
                                            {payment.orderCode ? (
                                                <button
                                                    type="button"
                                                    className="supplier-debt-reference-link"
                                                    onClick={() => onViewReference?.(payment.orderCode)}
                                                    title={`Xem chi tiết đơn ${payment.orderCode}`}
                                                >
                                                    {payment.orderCode}
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="supplier-payment-history__amount">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td>
                                            {payment.remainingDebtAfter != null
                                                ? formatCurrency(payment.remainingDebtAfter)
                                                : '—'}
                                        </td>
                                        <td className="supplier-table__notes">
                                            {payment.note || PAYMENT_METHOD_LABEL[payment.paymentMethod] || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SupplierPagination
                page={page}
                totalPages={data.totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
                onPageChange={setPage}
                itemLabel="giao dịch"
            />
        </div>
    );
}
