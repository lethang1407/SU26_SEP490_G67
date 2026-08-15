import { useState } from 'react';
import { Pencil, Wallet } from 'lucide-react';
import SupplierGeneralInfoTab from './SupplierGeneralInfoTab';
import SupplierImportHistoryTable from './SupplierImportHistoryTable';
import SupplierPaymentHistoryTable from './SupplierPaymentHistoryTable';
import SupplierOrderDetailModal from './SupplierOrderDetailModal';
import { suppliersApi } from '../api';

const TABS = [
    { id: 'general', label: 'Thông tin chung' },
    { id: 'import', label: 'Lịch sử nhập hàng' },
    { id: 'debt', label: 'Lịch sử thanh toán nợ' },
];

export default function SupplierDetailTabs({
    supplier,
    refreshToken,
    canPayDebt = false,
    onPayDebt,
    onEdit,
}) {
    const [activeTab, setActiveTab] = useState('general');
    const [viewingOrderId, setViewingOrderId] = useState(null);
    const showEditFooter = Boolean(onEdit) && activeTab === 'general';
    const historyRefresh = refreshToken || 0;

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
                            {tab.label}
                        </button>
                    ))}
                </div>

                {onPayDebt && (
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--pay supplier-detail-tabs__pay"
                        disabled={!canPayDebt}
                        onClick={onPayDebt}
                        title={canPayDebt ? 'Thanh toán nợ' : 'Không có công nợ'}
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
