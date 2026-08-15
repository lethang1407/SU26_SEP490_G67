import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import ImportOrderInfoTab from './ImportOrderInfoTab';
import ImportOrderPaymentHistoryTab from './ImportOrderPaymentHistoryTab';
import ImportOrderAlertModal from './ImportOrderAlertModal';
import { importOrdersApi } from '../api';
import { ORDER_STATUS } from '../constants';

const TABS = [
    { id: 'info', label: 'Thông tin' },
    { id: 'payments', label: 'Lịch sử thanh toán' },
];

export default function ImportOrderExpandPanel({ orderId, onDraftCancelled }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        setActiveTab('info');
        setCancelOpen(false);
        setCancelError('');

        importOrdersApi
            .getImportOrderDetail(orderId)
            .then((detail) => {
                if (cancelled) return;
                setOrder(detail);
            })
            .catch(() => {
                if (cancelled) return;
                setError(true);
                setOrder(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [orderId]);

    const handleCloseCancelModal = () => {
        if (cancelling) return;
        setCancelOpen(false);
        setCancelError('');
    };

    const handleConfirmCancel = async () => {
        if (cancelling || !order?.id) return;
        setCancelling(true);
        setCancelError('');
        try {
            await importOrdersApi.cancelDraftImportOrder(order.id);
            setCancelOpen(false);
            onDraftCancelled?.(order.id);
        } catch (err) {
            setCancelError(
                err?.response?.data?.message ||
                    err?.message ||
                    'Không thể hủy phiếu tạm. Vui lòng thử lại.',
            );
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="import-order-expand import-order-expand--state">
                Đang tải chi tiết phiếu nhập...
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="import-order-expand import-order-expand--state">
                Không tải được chi tiết phiếu nhập. Vui lòng thử lại.
            </div>
        );
    }

    const isDraft = order.orderStatus === ORDER_STATUS.DRAFT;
    const hasPayments = Number(order.paidAmount) > 0;
    const visibleTabs = hasPayments ? TABS : TABS.filter((tab) => tab.id !== 'payments');
    const currentTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'info';

    return (
        <div className="import-order-expand" onClick={(event) => event.stopPropagation()}>
            {visibleTabs.length > 1 && (
                <div className="import-order-expand__tabs" role="tablist">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={currentTab === tab.id}
                            className={`import-order-expand__tab ${
                                currentTab === tab.id ? 'import-order-expand__tab--active' : ''
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="import-order-expand__panel" role="tabpanel">
                {currentTab === 'info' && (
                    <ImportOrderInfoTab order={order} />
                )}
                {currentTab === 'payments' && hasPayments && (
                    <ImportOrderPaymentHistoryTab orderId={orderId} />
                )}
            </div>

            {isDraft && (
                <div className="import-order-expand__footer-actions">
                    <Link
                        to={`/admin/warehouse/import/${order.id}/edit`}
                        className="supplier-btn supplier-btn--secondary"
                    >
                        <Pencil size={16} />
                        Mở sửa phiếu
                    </Link>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--danger-outline"
                        disabled={cancelling}
                        onClick={() => {
                            setCancelError('');
                            setCancelOpen(true);
                        }}
                    >
                        <Trash2 size={16} />
                        Hủy phiếu tạm
                    </button>
                </div>
            )}

            <ImportOrderAlertModal
                open={cancelOpen}
                title="Hủy phiếu tạm"
                message={
                    cancelError ||
                    `Bạn có chắc muốn hủy phiếu tạm ${order.orderCode || ''}? Phiếu sẽ bị xóa khỏi danh sách và không thể khôi phục.`
                }
                confirmLabel={cancelError ? 'Đóng' : cancelling ? 'Đang hủy...' : 'Đồng ý'}
                cancelLabel={cancelError ? undefined : 'Quay lại'}
                onClose={handleCloseCancelModal}
                onConfirm={cancelError ? handleCloseCancelModal : handleConfirmCancel}
            />
        </div>
    );
}
