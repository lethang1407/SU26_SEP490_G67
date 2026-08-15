import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierSummaryCards from '../components/SupplierSummaryCards';
import SupplierToolbar from '../components/SupplierToolbar';
import SupplierTable from '../components/SupplierTable';
import SupplierPagination from '../components/SupplierPagination';
import SupplierAddNewModal from '../components/SupplierAddNewModal';
import { suppliersApi } from '../api';
import { categoriesApi } from '../../category/api';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';

const PAGE_SIZE = 10;

const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    totalDebt: 0,
    debtSupplierCount: 0,
};

export default function SupplierListPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const pendingExpandIdRef = useRef(null);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [deepLinkSearch, setDeepLinkSearch] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState('');

    // Deep-link từ phiếu nhập: mở đúng NCC (search theo mã rồi expand)
    useEffect(() => {
        const expandId = location.state?.expandSupplierId;
        if (expandId == null) return;

        const name = String(location.state?.expandSupplierName || '').trim();
        pendingExpandIdRef.current = expandId;
        setSelectedProduct(null);
        if (name) {
            setKeyword(name);
            setDebouncedKeyword(name);
            setDeepLinkSearch(name);
            setPage(1);
        } else {
            setExpandedId(expandId);
            pendingExpandIdRef.current = null;
        }
        navigate(location.pathname, { replace: true, state: {} });
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
            if (pendingExpandIdRef.current == null) {
                setExpandedId(null);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        const pendingId = pendingExpandIdRef.current;
        if (pendingId == null || loading) return;
        const found = (data.content || []).some((item) => item.id === pendingId);
        if (found) {
            setExpandedId(pendingId);
            pendingExpandIdRef.current = null;
        }
    }, [data, loading]);

    useEffect(() => {
        setCategoriesLoading(true);
        categoriesApi
            .getAllCategories()
            .then((items) => setCategories(Array.isArray(items) ? items : []))
            .catch(() => setCategories([]))
            .finally(() => setCategoriesLoading(false));
    }, []);

    const fetchSuppliers = useCallback((options = {}) => {
        const silent = options.silent === true;
        if (!silent) setLoading(true);
        suppliersApi
            .getSuppliers({
                page: page - 1,
                size: PAGE_SIZE,
                search: deepLinkSearch || debouncedKeyword,
                categoryId,
                productId: selectedProduct?.id ?? null,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => {
                if (!silent) setData(EMPTY_PAGE);
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [page, deepLinkSearch, debouncedKeyword, categoryId, selectedProduct]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleKeywordChange = useCallback((value) => {
        setKeyword(value);
        if (value) setDeepLinkSearch('');
    }, []);

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setPage(1);
        setExpandedId(null);
    };

    const handleClearProduct = () => {
        setSelectedProduct(null);
        setPage(1);
        setExpandedId(null);
    };

    const handleCategoryChange = (value) => {
        setCategoryId(value);
        setPage(1);
        setExpandedId(null);
    };

    const handleToggleExpand = (supplierId) => {
        setExpandedId((current) => (current === supplierId ? null : supplierId));
    };

    const handlePaymentSuccess = ({ orderCode, amount, paymentMethod, notes }) => {
        fetchSuppliers({ silent: true });
        setToast(
            `Đã ghi nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(amount)}đ cho đơn ${orderCode} (${paymentMethod})${notes ? `: ${notes}` : ''}.`,
        );
        setTimeout(() => setToast(''), 4000);
    };

    const handleSupplierUpdated = (updated) => {
        fetchSuppliers({ silent: true });
        setToast(`Đã cập nhật nhà cung cấp ${updated?.name || ''}.`);
        setTimeout(() => setToast(''), 3000);
    };

    const handleAddSupplier = (supplierData) => {
        suppliersApi
            .addSupplier(supplierData)
            .then(() => {
                setIsAddModalOpen(false);
                setPage(1);
                fetchSuppliers();
            })
            .catch((error) => {
                console.error('Error adding supplier:', error);
            });
    };

    const summary = {
        totalDebt: data.totalDebt ?? 0,
        debtSupplierCount: data.debtSupplierCount ?? 0,
    };

    const pagination = {
        page,
        totalPages: data.totalPages,
        totalItems: data.totalElements,
        startIndex: data.totalElements === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
        endIndex: Math.min(page * PAGE_SIZE, data.totalElements),
    };

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page">
                        {toast && <p className="supplier-page__toast">{toast}</p>}

                        <header className="supplier-page__header">
                            <div>
                                <h1 className="supplier-page__title">Danh sách nhà cung cấp</h1>
                                <p className="supplier-page__subtitle">
                                    Quản lý thông tin các nhà cung cấp trong hệ thống
                                </p>
                            </div>
                            <div className="supplier-page__actions">
                                <button
                                    type="button"
                                    className="supplier-btn supplier-btn--primary"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    <Plus size={20} />
                                    Thêm nhà cung cấp
                                </button>
                            </div>
                        </header>

                        <SupplierSummaryCards summary={summary} />

                        <SupplierToolbar
                            supplierKeyword={keyword}
                            selectedProduct={selectedProduct}
                            categoryId={categoryId}
                            categories={categories}
                            categoriesLoading={categoriesLoading}
                            onKeywordChange={handleKeywordChange}
                            onSelectProduct={handleSelectProduct}
                            onClearProduct={handleClearProduct}
                            onCategoryChange={handleCategoryChange}
                        />

                        <SupplierTable
                            items={data.content}
                            loading={loading}
                            expandedId={expandedId}
                            startIndex={pagination.startIndex}
                            emptyMessage={
                                selectedProduct
                                    ? 'Chưa có nhà cung cấp từng nhập sản phẩm này.'
                                    : 'Không tìm thấy nhà cung cấp phù hợp.'
                            }
                            onToggleExpand={handleToggleExpand}
                            onPaymentSuccess={handlePaymentSuccess}
                            onSupplierUpdated={handleSupplierUpdated}
                        />

                        <SupplierPagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            startIndex={pagination.startIndex}
                            endIndex={pagination.endIndex}
                            totalItems={pagination.totalItems}
                            onPageChange={(nextPage) => {
                                setExpandedId(null);
                                setPage(nextPage);
                            }}
                        />

                        <SupplierAddNewModal
                            open={isAddModalOpen}
                            onClose={() => setIsAddModalOpen(false)}
                            onSubmit={handleAddSupplier}
                        />
                    </div>
                </main>
            </div>
    );
}
