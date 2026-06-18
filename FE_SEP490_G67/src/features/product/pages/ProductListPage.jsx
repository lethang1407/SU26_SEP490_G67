import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductToolbar from '../components/ProductToolbar';
import ProductTable from '../components/ProductTable';
import ProductPagination from '../components/ProductPagination';
import { MOCK_PRODUCTS } from '../api/productMockData';
import {
    CATEGORY_FILTER,
    PRODUCT_ROUTES,
    STATUS_FILTER,
    SUPPLIER_FILTER,
} from '../constants';
import { filterProducts, paginateItems } from '../utils/productUtils';
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
    const [selectedIds, setSelectedIds] = useState([]);

    const filteredProducts = useMemo(
        () => filterProducts(MOCK_PRODUCTS, appliedFilters),
        [appliedFilters],
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
            supplierFilter,
        });
        setPage(1);
        setSelectedIds([]);
    };

    const handleToggleRow = (productId) => {
        setSelectedIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
        );
    };

    const handleToggleAll = (checked) => {
        if (checked) {
            setSelectedIds(pagination.items.map((item) => item.id));
            return;
        }
        setSelectedIds([]);
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

                        <ProductTable
                            items={pagination.items}
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
                    </div>
                </main>
            </div>
        </div>
    );
}
