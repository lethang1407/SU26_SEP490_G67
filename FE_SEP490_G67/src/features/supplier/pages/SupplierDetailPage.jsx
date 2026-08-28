import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierDetailHeader from '../components/SupplierDetailHeader';
import SupplierDetailStats from '../components/SupplierDetailStats';
import SupplierDetailTabs from '../components/SupplierDetailTabs';
import SupplierPaymentModal from '../components/SupplierPaymentModal';
import SupplierSuccessToast from '../components/SupplierSuccessToast';
import { suppliersApi } from '../api';
import { PAYMENT_METHOD_LABEL } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';

function buildShortLocation(address) {
    if (!address) return '';
    return address.split(',').slice(-2).join(',').trim();
}

export default function SupplierDetailPage() {
    const { id } = useParams();
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    // Tăng lên mỗi khi thanh toán thành công, để các tab con (lịch sử nhập hàng,
    // lịch sử thanh toán nợ) tự fetch lại dữ liệu mới nhất từ server.
    const [refreshToken, setRefreshToken] = useState(0);
    const [toast, setToast] = useState('');

    const fetchSupplier = useCallback((options = {}) => {
        const silent = options.silent === true;
        if (!silent) {
            setLoading(true);
            setNotFound(false);
        }
        suppliersApi
            .getSupplierById(id)
            .then((detail) => {
                if (!detail) {
                    if (!silent) {
                        setNotFound(true);
                        setSupplier(null);
                    }
                    return;
                }
                setSupplier({
                    ...detail,
                    shortLocation: buildShortLocation(detail.address),
                });
            })
            .catch(() => {
                if (!silent) {
                    setNotFound(true);
                    setSupplier(null);
                }
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        fetchSupplier();
    }, [fetchSupplier]);

    const handleEdit = () => {
        setToast('Chức năng sửa NCC sẽ được cập nhật khi có API.');
    };

    const handleOpenPayment = () => {
        setPaymentError('');
        setPaymentOpen(true);
    };

    const handlePaymentSubmit = ({ importOrderIds, orderCodes, amount, paymentMethod, notes }) => {
        setSubmittingPayment(true);
        setPaymentError('');
        suppliersApi
            .createBatchPayment(supplier.id, {
                importOrderIds,
                amount,
                paymentMethod,
                note: notes,
            })
            .then(() => {
                setPaymentOpen(false);
                fetchSupplier({ silent: true });
                setRefreshToken((token) => token + 1);
                const orderLabel = orderCodes?.length
                    ? orderCodes.join(', ')
                    : `${importOrderIds.length} phiếu`;
                const methodLabel = PAYMENT_METHOD_LABEL[paymentMethod] || paymentMethod;
                setToast(
                    `Đã ghi nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(amount)}đ cho ${orderLabel} (${methodLabel})${notes ? `: ${notes}` : ''}.`,
                );
            })
            .catch((error) => {
                setPaymentError(error.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
            })
            .finally(() => setSubmittingPayment(false));
    };

    if (loading) {
        return (
            <div className="admin-content">
                
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container supplier-page">
                            <div className="supplier-table-card supplier-table-card--empty">
                                <p>Đang tải thông tin nhà cung cấp...</p>
                            </div>
                        </div>
                    </main>
                </div>
        );
    }

    if (notFound || !supplier) {
        return (
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
        );
    }

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container supplier-page supplier-detail-page">
                        {toast && (
                            <SupplierSuccessToast
                                key={toast}
                                message={toast}
                                onDismiss={() => setToast('')}
                            />
                        )}

                        <SupplierDetailHeader
                            supplier={supplier}
                            onPayDebt={handleOpenPayment}
                            onEdit={handleEdit}
                        />

                        <SupplierDetailStats supplier={supplier} />

                        <SupplierDetailTabs
                            supplier={supplier}
                            refreshToken={refreshToken}
                        />

                        <SupplierPaymentModal
                            open={paymentOpen}
                            supplier={supplier}
                            submitting={submittingPayment}
                            submitError={paymentError}
                            onClose={() => setPaymentOpen(false)}
                            onSubmit={handlePaymentSubmit}
                        />
                    </div>
                </main>
            </div>
    );
}
