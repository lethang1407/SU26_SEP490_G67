import { AlertTriangle, Clock, Package } from 'lucide-react';
import { ATTENTION_REASON, ATTENTION_REASON_LABEL } from '../constants';

const REASON_META = {
    [ATTENTION_REASON.EXPIRED]: {
        icon: AlertTriangle,
        className: 'inventory-check-attention__group--expired',
    },
    [ATTENTION_REASON.EXPIRING_SOON]: {
        icon: Clock,
        className: 'inventory-check-attention__group--expiring',
    },
    [ATTENTION_REASON.NOT_CHECKED_RECENTLY]: {
        icon: Package,
        className: 'inventory-check-attention__group--stale',
    },
};

function groupByReason(items) {
    const order = [
        ATTENTION_REASON.EXPIRED,
        ATTENTION_REASON.EXPIRING_SOON,
        ATTENTION_REASON.NOT_CHECKED_RECENTLY,
    ];
    return order
        .map((code) => ({
            code,
            label: ATTENTION_REASON_LABEL[code] ?? code,
            items: items.filter((item) => item.reasonCode === code),
        }))
        .filter((group) => group.items.length > 0);
}

export default function InventoryCheckAttentionPanel({ items = [], onAddItem, loading = false }) {
    if (loading) {
        return (
            <section className="inventory-check-attention">
                <h2 className="inventory-check-attention__title">Cần kiểm ngay</h2>
                <p className="inventory-check-attention__empty">Đang tải cảnh báo...</p>
            </section>
        );
    }

    const groups = groupByReason(items);

    if (groups.length === 0) {
        return (
            <section className="inventory-check-attention">
                <h2 className="inventory-check-attention__title">Cần kiểm ngay</h2>
                <p className="inventory-check-attention__empty">
                    Hiện không có sản phẩm/lô cần ưu tiên kiểm.
                </p>
            </section>
        );
    }

    return (
        <section className="inventory-check-attention">
            <h2 className="inventory-check-attention__title">Cần kiểm ngay</h2>
            <p className="inventory-check-attention__subtitle">
                Bấm vào dòng để thêm nhanh vào phiếu kiểm.
            </p>
            <div className="inventory-check-attention__groups">
                {groups.map((group) => {
                    const meta = REASON_META[group.code] ?? {};
                    const Icon = meta.icon ?? Package;
                    return (
                        <div
                            key={group.code}
                            className={`inventory-check-attention__group ${meta.className ?? ''}`}
                        >
                            <h3 className="inventory-check-attention__group-title">
                                <Icon size={16} />
                                {group.label}
                                <span className="inventory-check-attention__count">
                                    {group.items.length}
                                </span>
                            </h3>
                            <ul className="inventory-check-attention__list">
                                {group.items.map((item) => (
                                    <li key={`${item.productId}-${item.batchId ?? 'all'}-${item.reasonCode}`}>
                                        <button
                                            type="button"
                                            className="inventory-check-attention__item"
                                            onClick={() => onAddItem?.(item)}
                                        >
                                            <span className="inventory-check-attention__item-name">
                                                {item.productName}
                                            </span>
                                            <span className="inventory-check-attention__item-meta">
                                                {item.batchCode
                                                    ? `Lô ${item.batchCode}`
                                                    : 'Tất cả lô'}
                                                {item.quantity != null ? ` · SL ${item.quantity}` : ''}
                                                {item.expiryDate ? ` · HSD ${item.expiryDate}` : ''}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
