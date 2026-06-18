import { Users, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';

export default function SupplierSummaryCards({ summary }) {
    const cards = [
        {
            id: 'total',
            label: 'Tổng nhà cung cấp',
            value: summary.totalSuppliers,
            icon: Users,
            iconBg: '#DBEAFE',
            iconColor: '#2563EB',
        },
        {
            id: 'debt',
            label: 'Tổng nợ cần trả',
            value: formatCurrency(summary.totalDebt),
            icon: Wallet,
            iconBg: '#FEE2E2',
            iconColor: '#DC2626',
            valueClass: summary.totalDebt > 0 ? 'supplier-stat-card__value--debt' : '',
        },
    ];

    return (
        <div className="supplier-stat-cards">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.id} className="supplier-stat-card">
                        <div className="supplier-stat-card__content">
                            <span className="supplier-stat-card__label">{card.label}</span>
                            <span className={`supplier-stat-card__value ${card.valueClass || ''}`}>
                                {card.value}
                            </span>
                        </div>
                        <div
                            className="supplier-stat-card__icon"
                            style={{ background: card.iconBg, color: card.iconColor }}
                        >
                            <Icon size={22} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
