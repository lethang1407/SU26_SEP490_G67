import { Wallet } from 'lucide-react';
import {
    formatCurrency,
    openTrialAmountOf,
    payableNowAmountOf,
} from '../utils/supplierUtils';

export default function SupplierDetailStats({ supplier }) {
    const currentDebt = Number(supplier?.currentDebt) || 0;
    const payableNow = payableNowAmountOf(supplier);
    const openTrial = openTrialAmountOf(supplier);
    const hasDebt = currentDebt > 0;

    let hint = '';
    if (hasDebt && payableNow <= 0 && openTrial > 0) {
        hint = 'Toàn bộ chờ quyết toán bán thử';
    } else if (hasDebt && openTrial > 0) {
        hint = `Có thể trả ngay ${formatCurrency(payableNow)} · chờ quyết toán ${formatCurrency(openTrial)}`;
    }

    return (
        <div className="supplier-stat-cards supplier-stat-cards--single supplier-detail-stats">
            <div className="supplier-stat-card">
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Công nợ hiện tại</span>
                    <span
                        className={`supplier-stat-card__value ${
                            hasDebt ? 'supplier-stat-card__value--debt' : ''
                        }`}
                    >
                        {formatCurrency(currentDebt)}
                    </span>
                    {hint ? (
                        <span
                            className={`supplier-stat-card__hint ${
                                payableNow <= 0 ? 'supplier-stat-card__hint--trial' : ''
                            }`}
                        >
                            {hint}
                        </span>
                    ) : null}
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
