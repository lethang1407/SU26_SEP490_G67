import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierDetailHeader from '../components/SupplierDetailHeader';
import SupplierDetailStats from '../components/SupplierDetailStats';
import SupplierDetailTabs from '../components/SupplierDetailTabs';
import SupplierPaymentModal from '../components/SupplierPaymentModal';
import { MOCK_SUPPLIERS } from '../constants';
import { MOCK_SUPPLIER_DETAILS, buildFallbackDetail } from '../constants/mockSupplierDetails';
import { getSupplierDetailById } from '../utils/supplierUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';

export default function SupplierDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [toast, setToast] = useState('');

    const supplier = useMemo(
        () => getSupplierDetailById(id, MOCK_SUPPLIERS, MOCK_SUPPLIER_DETAILS, buildFallbackDetail),
        [id],
    );

    const handleEdit = () => {
        setToast('Chức năng sửa NCC sẽ được cập nhật khi có API.');
        setTimeout(() => setToast(''), 3000);
    };

    const handlePaymentSubmit = ({ amount, paymentMethod, notes }) => {
        if (!amount || amount <= 0) {
            setToast('Số tiền thanh toán không hợp lệ.');
            return;
        }
        if (amount > supplier.currentDebt) {
            setToast('Số tiền vượt quá công nợ hiện tại.');
            return;
        }
        setPaymentOpen(false);
        setToast(
            `Đã ghi nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(amount)}đ (${paymentMethod})${notes ? `: ${notes}` : ''}. API sẽ được nối sau.`,
        );
        setTimeout(() => setToast(''), 4000);
    };

    if (!supplier) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container supplier-page">
                            <div className="supplier-table-card supplier-table-card--empty">
                                <p>Không tìm thấy nhà cung cấp.</p>
                                <Link to="/admin/warehouse/supplier" className="supplier-detail-back">
                                    ← Quay lại danh sách
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page supplier-detail-page">
                        {toast && <p className="supplier-page__toast">{toast}</p>}

                        <SupplierDetailHeader
                            supplier={supplier}
                            onPayDebt={() => setPaymentOpen(true)}
                            onEdit={handleEdit}
                        />

                        <SupplierDetailStats supplier={supplier} />

                        <SupplierDetailTabs supplier={supplier} />

                        <button
                            type="button"
                            className="supplier-detail-back-btn"
                            onClick={() => navigate('/admin/warehouse/supplier')}
                        >
                            ← Quay lại danh sách
                        </button>

                        <SupplierPaymentModal
                            open={paymentOpen}
                            supplier={supplier}
                            onClose={() => setPaymentOpen(false)}
                            onSubmit={handlePaymentSubmit}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
