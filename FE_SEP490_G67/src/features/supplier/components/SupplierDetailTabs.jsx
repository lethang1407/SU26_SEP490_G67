import { useState } from 'react';
import { Pencil, Trash2, Wallet } from 'lucide-react';
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
    onDelete,
    deleting = false,
}) {
    const [activeTab, setActiveTab] = useState('general');
    const [viewingOrderId, setViewingOrderId] = useState(null);
    const showCrudFooter = Boolean(onEdit || onDelete);

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
                        refreshToken={refreshToken}
                        onViewDetail={(order) => setViewingOrderId(order.id)}
                    />
                )}
                {activeTab === 'debt' && (
                    <SupplierPaymentHistoryTable
                        supplierId={supplier.id}
                        refreshToken={refreshToken}
                        onViewReference={handleViewReference}
                    />
                )}
            </div>

            {showCrudFooter && (
                <div className="supplier-detail-tabs__footer">
                    {onDelete ? (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--danger-outline supplier-detail-tabs__action-btn"
                            onClick={onDelete}
                            disabled={deleting}
                            title="Xóa nhà cung cấp"
                        >
                            <Trash2 size={16} />
                            {deleting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                    ) : (
                        <span />
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--primary supplier-detail-tabs__action-btn"
                            onClick={onEdit}
                            title="Chỉnh sửa nhà cung cấp"
                        >
                            <Pencil size={16} />
                            Chỉnh sửa
                        </button>
                    )}
                </div>
            )}

            <SupplierOrderDetailModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />
        </div>
    );
}
