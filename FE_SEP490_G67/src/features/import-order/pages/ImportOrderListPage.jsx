import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierPagination from '../../supplier/components/SupplierPagination';
import ImportOrderToolbar from '../components/ImportOrderToolbar';
import ImportOrderTable from '../components/ImportOrderTable';
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
    const [orderStatusFilter, setOrderStatusFilter] = useState(ORDER_STATUS_FILTER.ALL);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

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
            setExpandedId(null);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchImportOrders = useCallback(() => {
        setLoading(true);
        importOrdersApi
            .getImportOrders({
                page: page - 1,
                size: PAGE_SIZE,
                search: debouncedKeyword,
                orderStatus: orderStatusFilter,
                fromDate,
                toDate,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [page, debouncedKeyword, orderStatusFilter, fromDate, toDate]);

    useEffect(() => {
        fetchImportOrders();
    }, [fetchImportOrders]);

    const handleOrderStatusFilterChange = (value) => {
        setOrderStatusFilter(value);
        setPage(1);
        setExpandedId(null);
    };

    const handleDateRangeChange = ({ fromDate: nextFrom = '', toDate: nextTo = '' }) => {
        setFromDate(nextFrom);
        setToDate(nextTo);
        setPage(1);
        setExpandedId(null);
    };

    const handleToggleExpand = (orderId) => {
        setExpandedId((prev) => (prev === orderId ? null : orderId));
    };

    const handleDraftCancelled = () => {
        setExpandedId(null);
        fetchImportOrders();
    };

    const totalItems = data.totalElements ?? 0;

    return (
        <div className="admin-layout">
            {successMessage ? (
                <ImportOrderSuccessToast
                    message={successMessage}
                    onDismiss={() => setSuccessMessage(null)}
                />
            ) : null}
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page import-order-page">
                        <header className="supplier-page__header">
                            <div>
                                <h1 className="supplier-page__title">Danh sách nhập hàng</h1>
                                <p className="supplier-page__subtitle">
                                    Theo dõi các phiếu nhập hàng từ nhà cung cấp
                                </p>
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
                            items={data.content ?? []}
                            loading={loading}
                            expandedId={expandedId}
                            onToggleExpand={handleToggleExpand}
                            onDraftCancelled={handleDraftCancelled}
                        />

                        <SupplierPagination
                            page={page}
                            totalPages={data.totalPages ?? 1}
                            startIndex={totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                            endIndex={Math.min(page * PAGE_SIZE, totalItems)}
                            totalItems={totalItems}
                            onPageChange={(nextPage) => {
                                setExpandedId(null);
                                setPage(nextPage);
                            }}
                            itemLabel="đơn nhập"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
