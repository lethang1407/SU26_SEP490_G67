import { useCallback, useEffect, useState } from 'react';
import SupplierImportHistoryToolbar from './SupplierImportHistoryToolbar';
import SupplierPagination from './SupplierPagination';
import { IMPORT_HISTORY_FILTER, IMPORT_ORDER_STATUS_LABEL } from '../constants';
import { formatCurrency, formatDate } from '../utils/supplierUtils';
import { suppliersApi } from '../api';

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_PAGE = { content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 1 };

export default function SupplierImportHistoryTable({ supplierId, onViewDetail, refreshToken }) {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState(IMPORT_HISTORY_FILTER.ALL);
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

    const fetchImportOrders = useCallback(() => {
        if (!supplierId) return;
        setLoading(true);
        suppliersApi
            .getImportOrders(supplierId, {
                page: page - 1,
                size: PAGE_SIZE,
                search: debouncedKeyword,
                status: statusFilter,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [supplierId, page, debouncedKeyword, statusFilter]);

    // refreshToken không được dùng trong fetchImportOrders, chỉ là "tín hiệu" ép fetch lại
    // sau khi thanh toán nợ thành công ở expand panel.
    useEffect(() => {
        fetchImportOrders();
    }, [fetchImportOrders, refreshToken]);

    const handleKeywordChange = (value) => {
        setKeyword(value);
    };

    const handleStatusFilterChange = (value) => {
        setStatusFilter(value);
        setPage(1);
    };

    const totalItems = data.totalElements ?? 0;
    const startIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <div className="supplier-import-history">
            <SupplierImportHistoryToolbar
                keyword={keyword}
                statusFilter={statusFilter}
                onKeywordChange={handleKeywordChange}
                onStatusFilterChange={handleStatusFilterChange}
            />

            <div className="supplier-table-card">
                <div className="supplier-table-wrapper">
                    <table className="supplier-table supplier-table--detail">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Ngày nhập</th>
                                <th>Người tạo</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="supplier-table__empty-row">
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : data.content.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="supplier-table__empty-row">
                                        Không tìm thấy đơn nhập phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                data.content.map((order) => (
                                    <tr key={order.id}>
                                        <td>
                                            <button
                                                type="button"
                                                className="supplier-table__code-link"
                                                onClick={() => onViewDetail?.(order)}
                                                title={`Xem chi tiết đơn ${order.orderCode}`}
                                            >
                                                {order.orderCode}
                                            </button>
                                        </td>
                                        <td>{formatDate(order.receivedDate)}</td>
                                        <td>{order.createdByName || '—'}</td>
                                        <td className="supplier-table__debt">{formatCurrency(order.totalCost)}</td>
                                        <td>
                                            <span
                                                className={`supplier-import-status supplier-import-status--${order.status?.toLowerCase()}`}
                                            >
                                                {IMPORT_ORDER_STATUS_LABEL[order.status] || order.status}
                                            </span>
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
                itemLabel="đơn nhập"
            />
        </div>
    );
}
