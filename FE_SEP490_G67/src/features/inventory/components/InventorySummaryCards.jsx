import { AlertTriangle, CalendarX, Package, Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/inventoryUtils';

export default function InventorySummaryCards({ summary }) {
    const cards = [
        {
            id: 'total',
            label: 'Tổng số sản phẩm',
            value: summary.totalProducts,
            suffix: 'mặt hàng',
            icon: Package,
            iconBg: '#DBEAFE',
            iconColor: '#2563EB',
        },
        {
            id: 'expired',
            label: 'Sản phẩm hết hạn',
            value: summary.expiredProducts,
            suffix: 'mặt hàng',
            icon: CalendarX,
            iconBg: '#FEE2E2',
            iconColor: '#DC2626',
            valueClass: summary.expiredProducts > 0 ? 'inventory-stat-card__value--danger' : '',
        },
        {
            id: 'value',
            label: 'Giá trị tồn kho',
            value: formatCurrency(summary.inventoryValue),
            icon: Wallet,
            iconBg: '#DCFCE7',
            iconColor: '#16A34A',
        },
        {
            id: 'low-stock',
            label: 'Cảnh báo sắp hết',
            value: summary.lowStockCount,
            suffix: 'sản phẩm',
            icon: AlertTriangle,
            iconBg: '#FFEDD5',
            iconColor: '#EA580C',
            valueClass: summary.lowStockCount > 0 ? 'inventory-stat-card__value--warning' : '',
        },
    ];

    return (
        <div className="inventory-stat-cards">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div key={card.id} className="inventory-stat-card">
                        <div className="inventory-stat-card__content">
                            <span className="inventory-stat-card__label">{card.label}</span>
                            <div className="inventory-stat-card__value-row">
                                <span className={`inventory-stat-card__value ${card.valueClass || ''}`}>
                                    {card.value}
                                </span>
                                {card.suffix && (
                                    <span className="inventory-stat-card__suffix">{card.suffix}</span>
                                )}
                            </div>
                        </div>
                        <div
                            className="inventory-stat-card__icon"
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
