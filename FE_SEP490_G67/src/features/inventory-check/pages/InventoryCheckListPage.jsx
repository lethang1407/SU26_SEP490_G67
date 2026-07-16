import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { paginateItems } from '../../product/utils/productUtils';
import { MOCK_INVENTORY_CHECKS } from '../api/mockData';
import InventoryCheckToolbar from '../components/InventoryCheckToolbar';
import InventoryCheckTable from '../components/InventoryCheckTable';
import InventoryCheckPagination from '../components/InventoryCheckPagination';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import { filterInventoryChecks } from '../utils/inventoryCheckUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';

const PAGE_SIZE = 5;

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

    const filteredItems = useMemo(
        () => filterInventoryChecks(MOCK_INVENTORY_CHECKS, appliedFilters),
        [appliedFilters],
    );

    const pagination = useMemo(
        () => paginateItems(filteredItems, page, PAGE_SIZE),
        [filteredItems, page],
    );

    const handleApplyFilters = () => {
        setAppliedFilters({ keyword, dateFilter, statusFilter });
        setPage(1);
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Phiếu kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Quản lý và theo dõi quá trình kiểm kê theo lô và vị trí kệ.
                                    Mỗi kệ chỉ chứa một loại sản phẩm.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => window.alert('Chức năng xuất file đang phát triển.')}
                                >
                                    <Download size={18} />
                                    Xuất file
                                </button>
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

                        <InventoryCheckToolbar
                            keyword={keyword}
                            dateFilter={dateFilter}
                            statusFilter={statusFilter}
                            onKeywordChange={setKeyword}
                            onDateFilterChange={setDateFilter}
                            onStatusFilterChange={setStatusFilter}
                            onFilter={handleApplyFilters}
                        />

                        <InventoryCheckTable items={pagination.items} />

                        <InventoryCheckPagination
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
