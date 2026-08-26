import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierPagination from '../../supplier/components/SupplierPagination';
import ImportOrderToolbar from '../components/ImportOrderToolbar';
import ImportOrderTable from '../components/ImportOrderTable';
import ImportOrderDetailModal from '../components/ImportOrderDetailModal';
import ImportOrderSuccessToast from '../components/ImportOrderSuccessToast';
import { ORDER_STATUS_FILTER } from '../constants';
import { importOrdersApi } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export default function ImportOrderListPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState(
        location.state?.orderStatusFilter ?? null,
    );
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const trimmedKeyword = debouncedKeyword.trim();
    const hasDateFilter = Boolean(fromDate || toDate);
    const hasActiveListQuery =
        trimmedKeyword.length > 0 || orderStatusFilter != null || hasDateFilter;
    const appliedOrderStatus = orderStatusFilter ?? ORDER_STATUS_FILTER.ALL;

    useEffect(() => {
        if (location.state?.successMessage) {
            setSuccessMessage(location.state.successMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
            setSelectedOrderId(null);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchImportOrders = useCallback(() => {
        if (!hasActiveListQuery) {
            setData(EMPTY_PAGE);
            setLoading(false);
            return;
        }

        setLoading(true);
        importOrdersApi
            .getImportOrders({
                page: page - 1,
                size: PAGE_SIZE,
                search: trimmedKeyword,
                orderStatus: appliedOrderStatus,
                fromDate,
                toDate,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [hasActiveListQuery, page, trimmedKeyword, appliedOrderStatus, fromDate, toDate]);

    useEffect(() => {
        fetchImportOrders();
    }, [fetchImportOrders]);

    const handleOrderStatusFilterChange = (value) => {
        setOrderStatusFilter(value);
        setPage(1);
        setSelectedOrderId(null);
    };

    const handleDateRangeChange = ({ fromDate: nextFrom = '', toDate: nextTo = '' }) => {
        setFromDate(nextFrom);
        setToDate(nextTo);
        setPage(1);
        setSelectedOrderId(null);
    };

    const handleOpenDetail = (orderId) => {
        setSelectedOrderId(orderId);
    };

    const handleCloseDetail = () => {
        setSelectedOrderId(null);
    };

    const handleDraftCancelled = () => {
        setSelectedOrderId(null);
        fetchImportOrders();
    };

    const totalItems = data.totalElements ?? 0;

    return (
        <div className="admin-content">
            {successMessage ? (
                <ImportOrderSuccessToast
                    message={successMessage}
                    onDismiss={() => setSuccessMessage(null)}
                />
            ) : null}
            <AdminHeader />
            <main className="admin-main">
                <div className="dashboard-container supplier-page import-order-page">
                    <header className="supplier-page__header">
                        <div>
                            <h1 className="supplier-page__title">Danh sách phiếu nhập hàng</h1>
                        </div>
                        <div className="supplier-page__actions">
                            <Link to="/admin/warehouse/import/create" className="supplier-btn supplier-btn--primary">
                                <Plus size={20} />
                                Tạo phiếu nhập
                            </Link>
                        </div>
                    </header>

                    <ImportOrderToolbar
                        keyword={keyword}
                        orderStatusFilter={orderStatusFilter}
                        fromDate={fromDate}
                        toDate={toDate}
                        onKeywordChange={setKeyword}
                        onOrderStatusFilterChange={handleOrderStatusFilterChange}
                        onDateRangeChange={handleDateRangeChange}
                    />

                    <ImportOrderTable
                        items={hasActiveListQuery ? (data.content ?? []) : []}
                        loading={hasActiveListQuery && loading}
                        startIndex={totalItems === 0 ? 1 : (page - 1) * PAGE_SIZE + 1}
                        emptyMessage={
                            hasActiveListQuery
                                ? 'Không tìm thấy phiếu nhập hàng phù hợp.'
                                : 'Nhập từ khóa tìm kiếm, chọn trạng thái hoặc khoảng ngày để hiển thị danh sách phiếu nhập hàng.'
                        }
                        onOpenDetail={handleOpenDetail}
                    />

                    <ImportOrderDetailModal
                        open={Boolean(selectedOrderId)}
                        orderId={selectedOrderId}
                        onClose={handleCloseDetail}
                        onDraftCancelled={handleDraftCancelled}
                    />

                    {hasActiveListQuery ? (
                        <SupplierPagination
                            page={page}
                            totalPages={data.totalPages ?? 1}
                            startIndex={totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                            endIndex={Math.min(page * PAGE_SIZE, totalItems)}
                            totalItems={totalItems}
                            onPageChange={(nextPage) => {
                                setSelectedOrderId(null);
                                setPage(nextPage);
                            }}
                            itemLabel="phiếu nhập"
                        />
                    ) : null}
                </div>
            </main>
        </div>
    );
}
