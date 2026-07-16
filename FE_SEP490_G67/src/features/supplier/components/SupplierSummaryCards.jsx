import { Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';

export default function SupplierSummaryCards({ summary }) {
    return (
        <div className="supplier-stat-cards supplier-stat-cards--single">
            <div className="supplier-stat-card supplier-stat-card--featured">
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Tổng nợ cần trả</span>
                    <span className="supplier-stat-card__value supplier-stat-card__value--debt">
                        {formatCurrency(summary.totalDebt)}
                    </span>
                </div>
                <div
                    className="supplier-stat-card__icon"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}
                >
                    <Wallet size={20} />
                </div>
            </div>
        </div>
    );
}
