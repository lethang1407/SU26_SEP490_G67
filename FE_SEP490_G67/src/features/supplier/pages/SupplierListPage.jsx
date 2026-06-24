import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierSummaryCards from '../components/SupplierSummaryCards';
import SupplierToolbar from '../components/SupplierToolbar';
import SupplierTable from '../components/SupplierTable';
import SupplierPagination from '../components/SupplierPagination';
import SupplierAddNewModal from '../components/SupplierAddNewModal';
import { MOCK_SUPPLIERS, SUPPLIER_STATUS_FILTER } from '../constants';
import { buildSummary, filterSuppliers, paginateItems } from '../utils/supplierUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import {suppliersApi} from '../api';
const PAGE_SIZE = 10;

export default function SupplierListPage() {
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState(SUPPLIER_STATUS_FILTER.ALL);
    const [page, setPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const filteredSuppliers = useMemo(
        () => filterSuppliers(MOCK_SUPPLIERS, { keyword, statusFilter }),
        [keyword, statusFilter],
    );

    const summary = useMemo(() => buildSummary(MOCK_SUPPLIERS), []);

    const pagination = useMemo(
        () => paginateItems(filteredSuppliers, page, PAGE_SIZE),
        [filteredSuppliers, page],
    );

    const handleKeywordChange = (value) => {
        setKeyword(value);
        setPage(1);
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value);
        setPage(1);
    };

    const handleAddSupplier = (supplierData) => {
        suppliersApi.addSupplier(supplierData)
            .then((response) => {
                console.log('Supplier added successfully:', response);
            })
            .catch((error) => {
                console.error('Error adding supplier:', error);
            })
            .finally(() => {
                setIsAddModalOpen(false);
            });
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
                                    className="supplier-btn supplier-btn--secondary"
                                    disabled
                                    title="Sắp có"
                                >
                                    <Download size={18} />
                                    Xuất Excel
                                </button>
                                <button
                                    type="button"
                                    className="supplier-btn supplier-btn--primary"
                                    onClick={() => setIsAddModalOpen(true)}
                                >
                                    <Plus size={18} />
                                    Thêm nhà cung cấp
                                </button>
                            </div>
                        </header>

                        <SupplierSummaryCards summary={summary} />

                        <SupplierToolbar
                            keyword={keyword}
                            statusFilter={statusFilter}
                            onKeywordChange={handleKeywordChange}
                            onStatusChange={handleStatusChange}
                        />

                        <SupplierTable items={pagination.items} loading={false} />

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
