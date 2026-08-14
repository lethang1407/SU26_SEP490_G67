import { useNavigate } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierPagination from '../../supplier/components/SupplierPagination';
import SalesOrderToolbar from '../components/SalesOrderToolbar';
import SalesOrderTable from '../components/SalesOrderTable';
import { useSalesOrderList } from '../hooks/useSalesOrderList';
import { getInvoiceData } from '../api';
import { printInvoice } from '../../pos-screen/utils/printInvoice';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/SalesOrder.css';

export default function SalesOrderListPage() {
    const navigate = useNavigate();
    const {
        keyword,
        setKeyword,
        dateFilter,
        setDateFilter,
        customFrom,
        setCustomFrom,
        customTo,
        setCustomTo,
        orderStatus,
        setOrderStatus,
        paymentMethod,
        setPaymentMethod,
        debtFilter,
        setDebtFilter,
        page,
        setPage,
        data,
        loading,
        error,
        pageSize,
    } = useSalesOrderList();

    const totalItems = data.totalElements ?? 0;

    const handlePrint = async (orderId) => {
        try {
            const invoice = await getInvoiceData(orderId);
            printInvoice(invoice);
        } catch {
            alert('Không thể tải hóa đơn để in.');
        }
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page sales-order-page">
                        <header className="supplier-page__header">
                            <div>
                                <h1 className="supplier-page__title">Đơn hàng bán</h1>
                                <p className="supplier-page__subtitle">
                                    Tra cứu và xem chi tiết các đơn bán từ POS
                                </p>
                            </div>
                            <div className="supplier-page__actions">
                                <button
                                    type="button"
                                    className="supplier-btn supplier-btn--primary"
                                    onClick={() => navigate('/admin/pos')}
                                >
                                    Mở POS
                                </button>
                            </div>
                        </header>

                        <SalesOrderToolbar
                            keyword={keyword}
                            onKeywordChange={setKeyword}
                            dateFilter={dateFilter}
                            onDateFilterChange={setDateFilter}
                            customFrom={customFrom}
                            customTo={customTo}
                            onCustomFromChange={setCustomFrom}
                            onCustomToChange={setCustomTo}
                            orderStatus={orderStatus}
                            onOrderStatusChange={setOrderStatus}
                            paymentMethod={paymentMethod}
                            onPaymentMethodChange={setPaymentMethod}
                            debtFilter={debtFilter}
                            onDebtFilterChange={setDebtFilter}
                        />

                        <SalesOrderTable
                            items={data.content ?? []}
                            loading={loading}
                            error={error}
                            onPrint={handlePrint}
                        />

                        <SupplierPagination
                            page={page}
                            totalPages={data.totalPages ?? 1}
                            startIndex={totalItems === 0 ? 0 : (page - 1) * pageSize + 1}
                            endIndex={Math.min(page * pageSize, totalItems)}
                            totalItems={totalItems}
                            onPageChange={setPage}
                            itemLabel="đơn hàng"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
