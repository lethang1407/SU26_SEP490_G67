import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchInventoryChecks } from '../api';
import InventoryCheckToolbar from '../components/InventoryCheckToolbar';
import InventoryCheckTable from '../components/InventoryCheckTable';
import InventoryCheckPagination from '../components/InventoryCheckPagination';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import { filterInventoryChecks } from '../utils/inventoryCheckUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';
import '../../../css/Supplier.css';

const PAGE_SIZE = 5;
const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export default function InventoryCheckListPage() {
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

    const loadChecks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchInventoryChecks({
                page: page - 1,
                size: PAGE_SIZE,
                search: appliedFilters.keyword,
                status: appliedFilters.statusFilter,
            });

            let content = result.content ?? [];
            if (appliedFilters.dateFilter !== 'all') {
                content = filterInventoryChecks(content, {
                    keyword: '',
                    statusFilter: 'all',
                    dateFilter: appliedFilters.dateFilter,
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
            setError(getApiErrorMessage(fetchError, 'Không thể tải danh sách phiếu kiểm kho.'));
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, page]);

    useEffect(() => {
        loadChecks();
    }, [loadChecks]);

    const handleApplyFilters = () => {
        setAppliedFilters({ keyword, dateFilter, statusFilter });
        setPage(1);
    };

    const totalItems = data.totalElements ?? 0;
    const startIndex = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endIndex = Math.min(page * PAGE_SIZE, totalItems);

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Lịch sử kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Các phiếu kiểm đã lưu.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={() => navigate(INVENTORY_CHECK_ROUTES.create)}
                                >
                                    <Plus size={18} />
                                    Tạo phiếu kiểm kho
                                </button>
                            </div>
                        </header>

                        {error && (
                            <Alert variant="danger" className="mb-3">
                                {error}
                            </Alert>
                        )}

                        <InventoryCheckToolbar
                            keyword={keyword}
                            dateFilter={dateFilter}
                            statusFilter={statusFilter}
                            onKeywordChange={setKeyword}
                            onDateFilterChange={setDateFilter}
                            onStatusFilterChange={setStatusFilter}
                            onFilter={handleApplyFilters}
                        />

                        {loading ? (
                            <div className="inventory-check-table-card inventory-check-table-card--empty">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang tải phiếu kiểm kho...
                            </div>
                        ) : (
                            <InventoryCheckTable items={data.content} />
                        )}

                        <InventoryCheckPagination
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
    );
}
