import { FlaskConical, Users, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';

function trialHint(summary) {
    const suppliers = Number(summary.openTrialSupplierCount) || 0;
    const orders = Number(summary.openTrialOrderCount) || 0;
    if (suppliers <= 0 && orders <= 0) {
        return 'Không có lô treo';
    }
    const supplierLabel = `${suppliers} NCC`;
    const orderLabel = `${orders} phiếu`;
    return `${supplierLabel} · ${orderLabel}`;
}

export default function SupplierSummaryCards({ summary, trialQueueOpen = false, onOpenTrialQueue }) {
    const trialAmount = Number(summary.openTrialAmount) || 0;
    return (
        <div className="supplier-stat-cards supplier-stat-cards--summary">
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

            <div className="supplier-stat-card supplier-stat-card--count">
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Số NCC còn nợ</span>
                    <span className="supplier-stat-card__value supplier-stat-card__value--count">
                        {summary.debtSupplierCount ?? 0}
                    </span>
                </div>
                <div
                    className="supplier-stat-card__icon"
                    style={{ background: '#FFEDD5', color: '#C2410C' }}
                >
                    <Users size={20} />
                </div>
            </div>

            <button
                type="button"
                className={`supplier-stat-card supplier-stat-card--trial${
                    trialQueueOpen ? ' supplier-stat-card--trial-active' : ''
                }`}
                onClick={onOpenTrialQueue}
                aria-haspopup="dialog"
                aria-expanded={trialQueueOpen}
                title="Bấm để xem danh sách lô bán thử chưa quyết toán"
            >
                <div className="supplier-stat-card__content">
                    <span className="supplier-stat-card__label">Chưa quyết toán bán thử</span>
                    <span className="supplier-stat-card__value supplier-stat-card__value--trial">
                        {formatCurrency(trialAmount)}
                    </span>
                    <span className="supplier-stat-card__hint">{trialHint(summary)}</span>
                </div>
                <div
                    className="supplier-stat-card__icon"
                    style={{ background: '#CCFBF1', color: '#0F766E' }}
                >
                    <FlaskConical size={20} />
                </div>
            </button>
        </div>
    );
}
