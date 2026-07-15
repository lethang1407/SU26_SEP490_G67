import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierSummaryCards from '../components/SupplierSummaryCards';
import SupplierToolbar from '../components/SupplierToolbar';
import SupplierTable from '../components/SupplierTable';
import SupplierPagination from '../components/SupplierPagination';
import SupplierAddNewModal from '../components/SupplierAddNewModal';
import { SUPPLIER_DEBT_FILTER } from '../constants';
import { suppliersApi } from '../api';
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
};

const SEARCH_DEBOUNCE_MS = 400;

export default function SupplierListPage() {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [debtFilter, setDebtFilter] = useState(SUPPLIER_DEBT_FILTER.ALL);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchSuppliers = useCallback(() => {
        setLoading(true);
        suppliersApi
            .getSuppliers({ page: page - 1, size: PAGE_SIZE, search: debouncedKeyword, debtFilter })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [page, debouncedKeyword, debtFilter]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleKeywordChange = (value) => {
        setKeyword(value);
    };

    const handleDebtFilterChange = (value) => {
        setDebtFilter(value);
        setPage(1);
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

    const summary = { totalDebt: data.totalDebt ?? 0 };

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
                            keyword={keyword}
                            debtFilter={debtFilter}
                            onKeywordChange={handleKeywordChange}
                            onDebtFilterChange={handleDebtFilterChange}
                        />

                        <SupplierTable items={data.content} loading={loading} />

                        <SupplierPagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            startIndex={pagination.startIndex}
                            endIndex={pagination.endIndex}
                            totalItems={pagination.totalItems}
                            onPageChange={setPage}
                        />

                        <SupplierAddNewModal
                            open={isAddModalOpen}
                            onClose={() => setIsAddModalOpen(false)}
                            onSubmit={handleAddSupplier}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
