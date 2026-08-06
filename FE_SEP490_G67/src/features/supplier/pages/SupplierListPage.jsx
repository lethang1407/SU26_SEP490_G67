import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
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

const SEARCH_DEBOUNCE_MS = 400;

export default function SupplierListPage() {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
            setExpandedId(null);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

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
            .getSuppliers({ page: page - 1, size: PAGE_SIZE, search: debouncedKeyword, categoryId })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => {
                if (!silent) setData(EMPTY_PAGE);
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [page, debouncedKeyword, categoryId]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleKeywordChange = (value) => {
        setKeyword(value);
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

    const handleSupplierDeleted = () => {
        setExpandedId(null);
        fetchSuppliers({ silent: true });
        setToast('Đã xóa nhà cung cấp.');
        setTimeout(() => setToast(''), 3000);
    };

    const handleAddSupplier = (supplierData) => {
        setAddSubmitting(true);
        setAddError('');
        suppliersApi
            .addSupplier(supplierData)
            .then(() => {
                setIsAddModalOpen(false);
                setPage(1);
                fetchSuppliers();
                setToast('Đã thêm nhà cung cấp mới.');
                setTimeout(() => setToast(''), 3000);
            })
            .catch((error) => {
                console.error('Error adding supplier:', error);
                setAddError(
                    error?.response?.data?.message || 'Thêm nhà cung cấp thất bại. Vui lòng thử lại.',
                );
            })
            .finally(() => setAddSubmitting(false));
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
        <div className="admin-layout">
            <SideBar />
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
                                    onClick={() => {
                                        setAddError('');
                                        setIsAddModalOpen(true);
                                    }}
                                >
                                    <Plus size={20} />
                                    Thêm nhà cung cấp
                                </button>
                            </div>
                        </header>

                        <SupplierSummaryCards summary={summary} />

                        <SupplierToolbar
                            keyword={keyword}
                            categoryId={categoryId}
                            categories={categories}
                            categoriesLoading={categoriesLoading}
                            onKeywordChange={handleKeywordChange}
                            onCategoryChange={handleCategoryChange}
                        />

                        <SupplierTable
                            items={data.content}
                            loading={loading}
                            expandedId={expandedId}
                            onToggleExpand={handleToggleExpand}
                            onPaymentSuccess={handlePaymentSuccess}
                            onSupplierUpdated={handleSupplierUpdated}
                            onSupplierDeleted={handleSupplierDeleted}
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
                            onClose={() => {
                                if (addSubmitting) return;
                                setIsAddModalOpen(false);
                                setAddError('');
                            }}
                            onSubmit={handleAddSupplier}
                            submitting={addSubmitting}
                            submitError={addError}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
