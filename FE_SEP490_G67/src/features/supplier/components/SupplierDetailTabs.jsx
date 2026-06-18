import { useState } from 'react';
import SupplierGeneralInfoTab from './SupplierGeneralInfoTab';
import SupplierImportHistoryTable from './SupplierImportHistoryTable';
import SupplierDebtHistoryTable from './SupplierDebtHistoryTable';

const TABS = [
    { id: 'general', label: 'Thông tin chung' },
    { id: 'import', label: 'Lịch sử nhập hàng' },
    { id: 'debt', label: 'Lịch sử công nợ' },
];

export default function SupplierDetailTabs({ supplier }) {
    const [activeTab, setActiveTab] = useState('general');

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
                    <SupplierImportHistoryTable items={supplier.importHistory} />
                )}
                {activeTab === 'debt' && <SupplierDebtHistoryTable items={supplier.debtHistory} />}
            </div>
        </div>
    );
}
