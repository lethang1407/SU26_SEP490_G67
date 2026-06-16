import { useState } from 'react';
import {
    Receipt,
    Truck,
    Users,
    AlertTriangle,
    TrendingUp,
    ChevronDown,
} from 'lucide-react';

const expiredProducts = [
    { name: 'Sữa chua Vinamilk', detail: 'Hết hạn 2 ngày trước' },
    { name: 'Bánh mì sandwich', detail: 'Hết hạn hôm nay' },
    { name: 'Nước ép Twister', detail: 'Hết hạn 5 ngày trước' },
];

const lowStockProducts = [
    { name: 'Mì Hảo Hảo chua cay', detail: 'Còn 3 gói' },
    { name: 'Bia Tiger lon 330ml', detail: 'Còn 2 thùng' },
];

const lowStockExtra = 3; // "+ 3 sản phẩm khác..."

export default function StatCards() {
    const [expanded, setExpanded] = useState(false);

    const cards = [
        {
            id: 'revenue',
            label: 'Doanh Thu Hôm Nay',
            value: '2.350.000 đ',
            subtitle: '+12% so với hôm qua',
            subtitleClass: 'stat-card__subtitle--green',
            subtitleIcon: <TrendingUp size={14} />,
            small: '15 đơn hàng',
            icon: Receipt,
            iconBg: '#DCFCE7',
            iconColor: '#16a34a',
            accent: 'green',
        },
        {
            id: 'import',
            label: 'Tiền Nhập Hàng Hôm Nay',
            value: '850.000 đ',
            subtitle: '3 phiếu nhập',
            subtitleClass: '',
            small: 'Từ 2 nhà cung cấp',
            icon: Truck,
            iconBg: '#DBEAFE',
            iconColor: '#3B82F6',
            accent: 'blue',
        },
        {
            id: 'debt',
            label: 'Tổng Nợ Khách Hàng',
            value: '4.200.000 đ',
            subtitle: '8 khách đang nợ',
            subtitleClass: '',
            small: '⚠ 2 khoản quá hạn',
            smallClass: 'stat-card__small--red',
            icon: Users,
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            accent: 'amber',
        },
    ];

    return (
        <div className="stat-cards">
            {/* Cards 1-3 */}
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.id}
                        className={`stat-card stat-card--${card.accent}`}
                        tabIndex={0}
                        role="button"
                        aria-label={`${card.label}: ${card.value}`}
                    >
                        <div className="stat-card__top">
                            <div className="stat-card__info">
                                <span className="stat-card__label">{card.label}</span>
                                <span className="stat-card__value">{card.value}</span>
                            </div>
                            <div
                                className="stat-card__icon"
                                style={{ background: card.iconBg }}
                            >
                                <Icon size={22} color={card.iconColor} />
                            </div>
                        </div>
                        {card.subtitle && (
                            <div className={`stat-card__subtitle ${card.subtitleClass || ''}`}>
                                {card.subtitleIcon || null}
                                {card.subtitle}
                            </div>
                        )}
                        {card.small && (
                            <span className={`stat-card__small ${card.smallClass || ''}`}>
                                {card.small}
                            </span>
                        )}
                        <button className="stat-card__detail-link">
                            Xem chi tiết →
                        </button>
                    </div>
                );
            })}

            {/* Card 4 — Expandable Inventory Problems */}
            <div className={`stat-card stat-card--red stat-card--expandable`}>
                <div
                    className="stat-card__top"
                    onClick={() => setExpanded(!expanded)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    aria-label="Hàng Tồn Kho Có Vấn Đề: 8 sản phẩm. Nhấn để xem chi tiết."
                >
                    <div className="stat-card__info">
                        <span className="stat-card__label">Hàng Tồn Kho Có Vấn Đề</span>
                        <span className="stat-card__value" style={{ color: '#EF4444' }}>
                            8 sản phẩm
                        </span>
                        <div className="stat-card__badges">
                            <span className="stat-card__badge stat-card__badge--red">
                                🔴 3 hết hạn
                            </span>
                            <span className="stat-card__badge stat-card__badge--orange">
                                🟠 5 sắp hết
                            </span>
                        </div>
                    </div>
                    <div
                        className="stat-card__icon"
                        style={{ background: '#FEE2E2' }}
                    >
                        <AlertTriangle size={22} color="#EF4444" />
                    </div>
                </div>

                {/* Chevron */}
                <span
                    className={`stat-card__chevron ${expanded ? 'stat-card__chevron--up' : ''}`}
                    onClick={() => setExpanded(!expanded)}
                >
                    <ChevronDown size={16} />
                </span>

                {/* Expanded content */}
                <div className={`stat-card__expanded ${expanded ? 'stat-card__expanded--open' : ''}`}>
                    <div className="stat-card__expanded-inner">
                        {/* Expired Section */}
                        <div className="expanded-section__title expanded-section__title--red">
                            🔴 Đã Hết Hạn ({expiredProducts.length})
                        </div>
                        {expiredProducts.map((item, i) => (
                            <div key={i} className="expanded-row">
                                <div className="expanded-row__info">
                                    <span className="expanded-row__name">{item.name}</span>
                                    <span className="expanded-row__detail">{item.detail}</span>
                                </div>
                                <button className="expanded-row__btn expanded-row__btn--red">
                                    Điều chỉnh
                                </button>
                            </div>
                        ))}

                        <div className="expanded-divider" />

                        {/* Low Stock Section */}
                        <div className="expanded-section__title expanded-section__title--orange">
                            🟠 Sắp Hết Hàng ({lowStockProducts.length + lowStockExtra})
                        </div>
                        {lowStockProducts.map((item, i) => (
                            <div key={i} className="expanded-row">
                                <div className="expanded-row__info">
                                    <span className="expanded-row__name">{item.name}</span>
                                    <span className="expanded-row__detail">{item.detail}</span>
                                </div>
                                <button className="expanded-row__btn expanded-row__btn--orange">
                                    Nhập hàng
                                </button>
                            </div>
                        ))}
                        <div className="expanded-more">
                            + {lowStockExtra} sản phẩm khác...
                        </div>

                        <div className="expanded-footer">
                            <button className="expanded-footer__link">
                                Xem tất cả trong Kho →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
