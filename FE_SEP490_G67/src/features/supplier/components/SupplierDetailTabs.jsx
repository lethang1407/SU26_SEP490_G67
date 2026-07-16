import { useState } from 'react';
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

export default function SupplierDetailTabs({ supplier, refreshToken }) {
    const [activeTab, setActiveTab] = useState('general');
    const [viewingOrderId, setViewingOrderId] = useState(null);

    const handleViewReference = async (referenceCode) => {
        try {
            // "Lịch sử thanh toán nợ" chỉ trả về mã đơn tham chiếu, chưa có id đơn thật —
            // tìm đơn nhập tương ứng qua API tìm kiếm theo mã đơn để mở modal chi tiết.
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

            <SupplierOrderDetailModal orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />
        </div>
    );
}
