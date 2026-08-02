import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierPagination from '../../supplier/components/SupplierPagination';
import ImportOrderToolbar from '../components/ImportOrderToolbar';
import ImportOrderTable from '../components/ImportOrderTable';
import { ORDER_STATUS_FILTER } from '../constants';
import { importOrdersApi } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export default function ImportOrderListPage() {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState(ORDER_STATUS_FILTER.ALL);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchImportOrders = useCallback(() => {
        setLoading(true);
        importOrdersApi
            .getImportOrders({
                page: page - 1,
                size: PAGE_SIZE,
                search: debouncedKeyword,
                orderStatus: orderStatusFilter,
            })
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => setData(EMPTY_PAGE))
            .finally(() => setLoading(false));
    }, [page, debouncedKeyword, orderStatusFilter]);

    useEffect(() => {
        fetchImportOrders();
    }, [fetchImportOrders]);

    const handleOrderStatusFilterChange = (value) => {
        setOrderStatusFilter(value);
        setPage(1);
    };

    const totalItems = data.totalElements ?? 0;

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page import-order-page">
                        <header className="supplier-page__header">
                            <div>
                                <h1 className="supplier-page__title">Danh sách nhập hàng</h1>
                                <p className="supplier-page__subtitle">
                                    Theo dõi các phiếu nhập hàng từ nhà cung cấp
                                </p>
                            </div>
                            <div className="supplier-page__actions">
                                <button type="button" className="supplier-btn supplier-btn--primary" disabled>
                                    <Plus size={20} />
                                    Tạo phiếu nhập
                                </button>
                            </div>
                        </header>

                        <ImportOrderToolbar
                            keyword={keyword}
                            orderStatusFilter={orderStatusFilter}
                            onKeywordChange={setKeyword}
                            onOrderStatusFilterChange={handleOrderStatusFilterChange}
                        />

                        <ImportOrderTable items={data.content ?? []} loading={loading} />

                        <SupplierPagination
                            page={page}
                            totalPages={data.totalPages ?? 1}
                            startIndex={totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                            endIndex={Math.min(page * PAGE_SIZE, totalItems)}
                            totalItems={totalItems}
                            onPageChange={setPage}
                            itemLabel="đơn nhập"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
