import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { ClipboardCheck, Download } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getProductList } from '../../product/api';
import { paginateItems } from '../../product/utils/productUtils';
import { getApiErrorMessage } from '../../../utils/api-utils';
import InventorySummaryCards from '../components/InventorySummaryCards';
import InventoryToolbar from '../components/InventoryToolbar';
import InventoryTable from '../components/InventoryTable';
import InventoryPagination from '../components/InventoryPagination';
import { CATEGORY_FILTER, INVENTORY_ROUTES, INVENTORY_STATUS } from '../constants';
import { buildInventorySummary, filterInventoryProducts } from '../utils/inventoryUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';

const PAGE_SIZE = 10;
const FETCH_SIZE = 1000;

export default function InventoryListPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER.ALL);
    const [statusFilter, setStatusFilter] = useState(INVENTORY_STATUS.ALL);
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        categoryFilter: CATEGORY_FILTER.ALL,
        statusFilter: INVENTORY_STATUS.ALL,
    });
    const [page, setPage] = useState(1);
    const [allProducts, setAllProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter === 'low-stock') {
            setStatusFilter(INVENTORY_STATUS.LOW_STOCK);
            setAppliedFilters((prev) => ({
                ...prev,
                statusFilter: INVENTORY_STATUS.LOW_STOCK,
            }));
        }
    }, [searchParams]);

    useEffect(() => {
        let isCancelled = false;

        const fetchProducts = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await getProductList({
                    keyword: appliedFilters.keyword.trim() || undefined,
                    category:
                        appliedFilters.categoryFilter === CATEGORY_FILTER.ALL
                            ? undefined
                            : appliedFilters.categoryFilter,
                    page: 0,
                    size: FETCH_SIZE,
                });

                if (!isCancelled) {
                    setAllProducts(result.content ?? []);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setAllProducts([]);
                    setError(
                        getApiErrorMessage(fetchError, 'Không thể tải dữ liệu tồn kho. Vui lòng thử lại.'),
                    );
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchProducts();

        return () => {
            isCancelled = true;
        };
    }, [appliedFilters.keyword, appliedFilters.categoryFilter]);

    const summary = useMemo(() => buildInventorySummary(allProducts), [allProducts]);

    const filteredProducts = useMemo(
        () =>
            filterInventoryProducts(allProducts, {
                keyword: appliedFilters.keyword,
                categoryFilter: appliedFilters.categoryFilter,
                statusFilter: appliedFilters.statusFilter,
            }),
        [allProducts, appliedFilters],
    );

    const pagination = useMemo(
        () => paginateItems(filteredProducts, page, PAGE_SIZE),
        [filteredProducts, page],
    );

    const handleApplyFilters = () => {
        setAppliedFilters({
            keyword,
            categoryFilter,
            statusFilter,
        });
        setPage(1);
    };

    const handleExportExcel = () => {
        window.alert('Chức năng xuất Excel đang được phát triển.');
    };

    const handleInventoryCheck = () => {
        navigate(INVENTORY_ROUTES.check);
    };

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Quản lý kho hàng</h1>
                                <p className="inventory-page__subtitle">
                                    Theo dõi giá trị tồn kho và biến động hàng hóa trong hệ thống.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={handleExportExcel}
                                >
                                    <Download size={18} />
                                    Xuất Excel
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={handleInventoryCheck}
                                >
                                    <ClipboardCheck size={18} />
                                    Kiểm kho
                                </button>
                            </div>
                        </header>

                        <InventorySummaryCards summary={summary} />

                        <InventoryToolbar
                            keyword={keyword}
                            categoryFilter={categoryFilter}
                            statusFilter={statusFilter}
                            onKeywordChange={setKeyword}
                            onCategoryChange={setCategoryFilter}
                            onStatusChange={setStatusFilter}
                            onFilter={handleApplyFilters}
                        />

                        {error && <Alert variant="danger">{error}</Alert>}

                        {isLoading ? (
                            <div className="text-center p-5">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </Spinner>
                            </div>
                        ) : (
                            <>
                                <InventoryTable items={pagination.items} />

                                <InventoryPagination
                                    page={pagination.page}
                                    totalPages={pagination.totalPages}
                                    startIndex={pagination.startIndex}
                                    endIndex={pagination.endIndex}
                                    totalItems={pagination.totalItems}
                                    onPageChange={setPage}
                                />
                            </>
                        )}
                    </div>
                </main>
            </div>
    );
}
