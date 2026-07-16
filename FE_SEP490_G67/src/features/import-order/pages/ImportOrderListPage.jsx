import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { Download, Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchImportOrders } from '../api';
import ImportOrderToolbar from '../components/ImportOrderToolbar';
import ImportOrderTable from '../components/ImportOrderTable';
import ImportOrderPagination from '../components/ImportOrderPagination';
import { IMPORT_ORDER_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/ImportOrder.css';

const PAGE_SIZE = 5;
const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export default function ImportOrderListPage() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        dateFilter: 'all',
        statusFilter: 'all',
    });
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const status =
                appliedFilters.statusFilter === 'all'
                    ? 'ALL'
                    : appliedFilters.statusFilter.toUpperCase();

            const result = await fetchImportOrders({
                page: page - 1,
                size: PAGE_SIZE,
                search: appliedFilters.keyword,
                status,
            });

            let content = result.content ?? [];

            if (appliedFilters.dateFilter !== 'all') {
                const now = new Date();
                content = content.filter((item) => {
                    if (!item.receivedDate) return false;
                    const receivedDate = new Date(item.receivedDate);
                    if (appliedFilters.dateFilter === 'this_month') {
                        return (
                            receivedDate.getMonth() === now.getMonth() &&
                            receivedDate.getFullYear() === now.getFullYear()
                        );
                    }
                    if (appliedFilters.dateFilter === 'last_month') {
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        return (
                            receivedDate.getMonth() === lastMonth.getMonth() &&
                            receivedDate.getFullYear() === lastMonth.getFullYear()
                        );
                    }
                    return true;
                });
            }

            setData({
                content,
                page: result.page ?? page - 1,
                size: result.size ?? PAGE_SIZE,
                totalElements:
                    appliedFilters.dateFilter === 'all'
                        ? (result.totalElements ?? content.length)
                        : content.length,
                totalPages:
                    appliedFilters.dateFilter === 'all'
                        ? Math.max(result.totalPages ?? 1, 1)
                        : Math.max(1, Math.ceil(content.length / PAGE_SIZE)),
            });
        } catch (fetchError) {
            setData(EMPTY_PAGE);
            setError(
                getApiErrorMessage(fetchError, 'Không thể tải danh sách đơn nhập hàng.'),
            );
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, page]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleApplyFilters = () => {
        setAppliedFilters({ keyword, dateFilter, statusFilter });
        setPage(1);
    };

    const totalItems = data.totalElements ?? 0;
    const startIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container import-order-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Đơn nhập hàng</h1>
                                <p className="inventory-page__subtitle">
                                    Quản lý các chứng từ nhập kho từ nhà cung cấp. Mỗi dòng nhập
                                    tương ứng một lô mới trong kho.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() =>
                                        window.alert('Chức năng xuất file đang phát triển.')
                                    }
                                >
                                    <Download size={18} />
                                    Xuất file
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={() => navigate(IMPORT_ORDER_ROUTES.create)}
                                >
                                    <Plus size={18} />
                                    Nhập hàng
                                </button>
                            </div>
                        </header>

                        {error && (
                            <Alert variant="danger" className="mb-3">
                                {error}
                            </Alert>
                        )}

                        <ImportOrderToolbar
                            keyword={keyword}
                            dateFilter={dateFilter}
                            statusFilter={statusFilter}
                            onKeywordChange={setKeyword}
                            onDateFilterChange={setDateFilter}
                            onStatusFilterChange={setStatusFilter}
                            onFilter={handleApplyFilters}
                        />

                        {loading ? (
                            <div className="import-order-table-card import-order-table-card--empty">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang tải đơn nhập hàng...
                            </div>
                        ) : (
                            <ImportOrderTable items={data.content} />
                        )}

                        <ImportOrderPagination
                            page={page}
                            totalPages={data.totalPages}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            totalItems={totalItems}
                            onPageChange={setPage}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
