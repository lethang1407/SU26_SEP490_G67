import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductToolbar from '../components/ProductToolbar';
import ProductTable from '../components/ProductTable';
import ProductPagination from '../components/ProductPagination';
import { getProductList } from '../api';
import {
    CATEGORY_FILTER,
    PRODUCT_ROUTES,
    STATUS_FILTER,
    SUPPLIER_FILTER,
} from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

const PAGE_SIZE = 10;

export default function ProductListPage() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER.ALL);
    const [statusFilter, setStatusFilter] = useState(STATUS_FILTER.ALL);
    const [supplierFilter, setSupplierFilter] = useState(SUPPLIER_FILTER.ALL);
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        categoryFilter: CATEGORY_FILTER.ALL,
        statusFilter: STATUS_FILTER.ALL,
        supplierFilter: SUPPLIER_FILTER.ALL,
    });
    const [page, setPage] = useState(1);

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
                    status:
                        appliedFilters.statusFilter === STATUS_FILTER.ALL
                            ? undefined
                            : appliedFilters.statusFilter,
                    page: page - 1,
                    size: PAGE_SIZE,
                });

                if (isCancelled) {
                    return;
                }

                let items = result.content ?? [];
                if (appliedFilters.supplierFilter !== SUPPLIER_FILTER.ALL) {
                    items = items.filter(
                        (product) => product.supplier === appliedFilters.supplierFilter,
                    );
                }

                const totalElements = result.totalElements ?? items.length;
                const totalPages = Math.max(result.totalPages ?? 1, 1);
                const currentPage = (result.page ?? 0) + 1;
                const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
                const endIndex = Math.min(currentPage * PAGE_SIZE, totalElements);

                setProducts(items);
                setPagination({
                    page: currentPage,
                    totalPages,
                    startIndex,
                    endIndex,
                    totalItems: totalElements,
                });
            } catch (fetchError) {
                if (!isCancelled) {
                    setProducts([]);
                    setError(getApiErrorMessage(fetchError, 'Không thể tải danh sách sản phẩm.'));
                    setPagination({
                        page: 1,
                        totalPages: 1,
                        startIndex: 0,
                        endIndex: 0,
                        totalItems: 0,
                    });
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
    }, [appliedFilters, page]);

    const handleApplyFilters = () => {
        setAppliedFilters({
            keyword,
            categoryFilter,
            statusFilter,
            supplierFilter,
        });
        setPage(1);
    };

    const handleAddProduct = () => {
        navigate(PRODUCT_ROUTES.create);
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container product-page">
                        <header className="product-page__header">
                            <div>
                                <h1 className="product-page__title">Danh sách sản phẩm</h1>
                                <p className="product-page__subtitle">
                                    Quản lý và theo dõi thông tin tất cả mặt hàng trong hệ thống.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="product-btn product-btn--primary"
                                onClick={handleAddProduct}
                            >
                                Thêm sản phẩm
                            </button>
                        </header>

                        <ProductToolbar
                            keyword={keyword}
                            categoryFilter={categoryFilter}
                            statusFilter={statusFilter}
                            supplierFilter={supplierFilter}
                            onKeywordChange={setKeyword}
                            onCategoryChange={setCategoryFilter}
                            onStatusChange={setStatusFilter}
                            onSupplierChange={setSupplierFilter}
                            onFilter={handleApplyFilters}
                        />

                        <ProductTable items={pagination.items} />

                        {isLoading ? (
                            <div className="text-center p-5">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </Spinner>
                            </div>
                        ) : (
                            <>
                                <ProductTable
                                    items={products}
                                    selectedIds={selectedIds}
                                    onToggleRow={handleToggleRow}
                                    onToggleAll={handleToggleAll}
                                />

                                <ProductPagination
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
        </div>
    );
}
