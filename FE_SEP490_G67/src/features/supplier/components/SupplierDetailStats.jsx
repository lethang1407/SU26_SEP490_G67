import { CalendarDays, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/supplierUtils';

export default function SupplierDetailStats({ supplier }) {
    const hasDebt = supplier.currentDebt > 0;

    return (
        <div className="supplier-stat-cards supplier-detail-stats">
            <div className="supplier-stat-card">
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Lần nhập hàng cuối</span>
                    <span className="supplier-stat-card__value supplier-stat-card__value--sm">
                        {supplier.lastImportDate ? formatDate(supplier.lastImportDate) : '—'}
                    </span>
                    {supplier.lastImportOrderCode && (
                        <span className="supplier-detail-stats__sub">
                            Mã đơn: {supplier.lastImportOrderCode}
                        </span>
                    )}
                </div>
                <div
                    className="supplier-stat-card__icon"
                    style={{ background: '#DBEAFE', color: '#2563EB' }}
                >
                    <CalendarDays size={22} />
                </div>
            </div>

            <div className="supplier-stat-card">
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Công nợ hiện tại</span>
                    <span
                        className={`supplier-stat-card__value ${
                            hasDebt ? 'supplier-stat-card__value--debt' : ''
                        }`}
                    >
                        {formatCurrency(supplier.currentDebt)}
                    </span>
                </div>
                <div
                    className="supplier-stat-card__icon"
                    style={{ background: hasDebt ? '#FEE2E2' : '#F1F5F9', color: hasDebt ? '#DC2626' : '#64748B' }}
                >
                    <Wallet size={22} />
                </div>
            </div>
        </div>
    );
}
