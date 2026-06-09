import { Wallet, ShoppingCart, Users, AlertTriangle, Wallet2, Wallet2Icon, UserCheck, User2, UserCheck2 } from 'lucide-react';

const stats = [
    {
        id: 'revenue',
        label: 'Doanh thu hôm nay',
        value: '5.240.000đ',
        icon: Wallet,
        iconBg: '#e8f4fd',
        iconColor: '#004AC6',
        footer: (
            <span className="stat-trend stat-trend--up">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2L12 8H2L7 2Z" fill="#16A34A" />
                </svg>
                +12% so với hôm qua
            </span>
        ),
    },
    {
        id: 'orders',
        label: 'Tổng đơn hàng',
        value: '42 đơn',
        icon: ShoppingCart,
        iconBg: '#DEE8FF',
        iconColor: '#505F76',
        footer: <span className="stat-sub">Đơn đổi trả: 0 đơn</span>,
    },
    {
        id: 'debt',
        label: 'Nợ khách hàng',
        value: '8.450.000đ',
        icon: Users,
        iconBg: 'rgb(223, 240, 228)',
        iconColor: '#16A34A',
        footer: (
            <span className="stat-link stat-link--orange">
                12 khách hàng nợ
            </span>
        ),
    },
    {
        id: 'low-stock',
        label: 'Sắp hết hàng',
        value: '8 sản phẩm',
        icon: AlertTriangle,
        iconBg: '#fff8e1',
        iconColor: '#d99733',
        highlight: true,
        footer: (
            <span className="stat-link stat-link--orange">
                Xem chi tiết →
            </span>
        ),
    },
];

export default function StatCards() {
    return (
        <div className="stat-cards">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.id}
                        className={`stat-card${stat.highlight ? ' stat-card' : ''}`}
                    >
                        <div className="stat-card__top">
                            <div className="stat-card__info">
                                <span className="stat-card__label">{stat.label}</span>
                                <span className={`stat-card__value${stat.highlight ? ' stat-card__value--orange' : ''}`}>
                                    {stat.value}
                                </span>
                            </div>
                            <div
                                className="stat-card__icon"
                                style={{ background: stat.iconBg }}
                            >
                                <Icon size={22} color={stat.iconColor} />
                            </div>
                        </div>
                        <div className="stat-card__footer">
                            {stat.footer}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
