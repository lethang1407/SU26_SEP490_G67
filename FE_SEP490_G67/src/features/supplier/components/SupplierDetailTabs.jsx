import { useEffect, useState } from 'react';
import { Pencil, Wallet } from 'lucide-react';
import SupplierGeneralInfoTab from './SupplierGeneralInfoTab';
import SupplierImportHistoryTable from './SupplierImportHistoryTable';
import SupplierPaymentHistoryTable from './SupplierPaymentHistoryTable';
import SupplierTrialTab from './SupplierTrialTab';
import SupplierOrderDetailModal from './SupplierOrderDetailModal';
import { suppliersApi } from '../api';
import { canPaySupplierDebt, payDebtButtonTitle } from '../utils/supplierUtils';

const TABS = [
    { id: 'general', label: 'Thông tin chung' },
    { id: 'import', label: 'Lịch sử nhập hàng' },
    { id: 'trial', label: 'Hàng bán thử' },
    { id: 'debt', label: 'Lịch sử thanh toán nợ' },
];

export default function SupplierDetailTabs({
    supplier,
    refreshToken,
    onPayDebt,
    onEdit,
    onTrialSettled,
}) {
    const [activeTab, setActiveTab] = useState('general');
    const [viewingOrderId, setViewingOrderId] = useState(null);
    const [openTrialCount, setOpenTrialCount] = useState(0);
    const showEditFooter = Boolean(onEdit) && activeTab === 'general';
    const historyRefresh = refreshToken || 0;
    const canPayDebt = canPaySupplierDebt(supplier);

    useEffect(() => {
        if (!supplier?.id) {
            setOpenTrialCount(0);
            return undefined;
        }
        let cancelled = false;
        suppliersApi
            .getOpenTrial(supplier.id)
            .then((result) => {
                if (!cancelled) {
                    const productCount = (result || []).reduce(
                        (sum, order) => sum + (order.lines || []).length,
                        0,
                    );
                    setOpenTrialCount(productCount);
                }
            })
            .catch(() => {
                if (!cancelled) setOpenTrialCount(0);
            });
        return () => {
            cancelled = true;
        };
    }, [supplier?.id, historyRefresh]);

    const handleViewReference = async (referenceCode) => {
        try {
            const result = await suppliersApi.getImportOrders(supplier.id, {
                search: referenceCode,
                size: 1,
            });
            const match = result?.content?.[0];
            if (match) {
                setViewingOrderId(match.id);
            }
        } catch {
            // Không tìm được đơn tham chiếu — bỏ qua, không mở modal
        }
    };

    return (
        <div className="supplier-detail-tabs">
            <div className="supplier-detail-tabs__nav-row">
                <div className="supplier-detail-tabs__nav" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`supplier-detail-tabs__btn ${
                                activeTab === tab.id ? 'supplier-detail-tabs__btn--active' : ''
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.id === 'trial' && openTrialCount > 0
                                ? `Hàng bán thử (${openTrialCount})`
                                : tab.label}
                        </button>
                    ))}
                </div>

                {onPayDebt && (
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--pay supplier-detail-tabs__pay"
                        disabled={!canPayDebt}
                        onClick={onPayDebt}
                        title={payDebtButtonTitle(supplier)}
                    >
                        <Wallet size={16} />
                        Thanh toán nợ
                    </button>
                )}
            </div>

            <div className="supplier-detail-tabs__panel" role="tabpanel">
                {activeTab === 'general' && <SupplierGeneralInfoTab supplier={supplier} />}
                {activeTab === 'import' && (
                    <SupplierImportHistoryTable
                        supplierId={supplier.id}
                        refreshToken={historyRefresh}
                        onViewDetail={(order) => setViewingOrderId(order.id)}
                    />
                )}
                {activeTab === 'trial' && (
                    <SupplierTrialTab
                        supplierId={supplier.id}
                        refreshToken={historyRefresh}
                        onSettled={onTrialSettled}
                    />
                )}
                {activeTab === 'debt' && (
                    <SupplierPaymentHistoryTable
                        supplierId={supplier.id}
                        refreshToken={historyRefresh}
                        onViewReference={handleViewReference}
                    />
                )}
            </div>

            {showEditFooter && (
                <div className="supplier-detail-tabs__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary supplier-detail-tabs__action-btn"
                        onClick={onEdit}
                        title="Chỉnh sửa nhà cung cấp"
                    >
                        <Pencil size={16} />
                        Chỉnh sửa
                    </button>
                </div>
            )}

            <SupplierOrderDetailModal
                orderId={viewingOrderId}
                onClose={() => setViewingOrderId(null)}
            />
        </div>
    );
}
