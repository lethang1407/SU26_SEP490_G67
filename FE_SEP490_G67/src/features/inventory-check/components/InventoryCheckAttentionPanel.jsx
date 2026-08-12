import { useState } from 'react';
import { AlertTriangle, ChevronDown, Clock, X } from 'lucide-react';
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
};

function groupByReason(items) {
    const order = [ATTENTION_REASON.EXPIRED, ATTENTION_REASON.EXPIRING_SOON];
    return order
        .map((code) => ({
            code,
            label: ATTENTION_REASON_LABEL[code] ?? code,
            items: items.filter((item) => item.reasonCode === code),
        }))
        .filter((group) => group.items.length > 0);
}

export default function InventoryCheckAttentionPanel({ items = [], onAddItem, loading = false }) {
    const [collapsed, setCollapsed] = useState(false);
    const groups = groupByReason(items);
    const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);

    return (
        <section
            className={`inventory-check-attention${collapsed ? ' inventory-check-attention--collapsed' : ''}`}
        >
            <div className="inventory-check-attention__header">
                <h2 className="inventory-check-attention__title">Cần kiểm ngay</h2>
                {!loading && totalCount > 0 ? (
                    <span className="inventory-check-attention__badge">{totalCount}</span>
                ) : null}
                <button
                    type="button"
                    className="inventory-check-attention__toggle"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? 'Mở cần kiểm ngay' : 'Đóng cần kiểm ngay'}
                    title={collapsed ? 'Mở' : 'Đóng'}
                >
                    {collapsed ? <ChevronDown size={18} /> : <X size={18} />}
                </button>
            </div>

            {collapsed ? null : loading ? (
                <p className="inventory-check-attention__empty">Đang tải cảnh báo...</p>
            ) : groups.length === 0 ? (
                <p className="inventory-check-attention__empty">
                    Hiện không có sản phẩm/lô cần ưu tiên kiểm.
                </p>
            ) : (
                <div className="inventory-check-attention__groups">
                    {groups.map((group) => {
                        const meta = REASON_META[group.code] ?? {};
                        const Icon = meta.icon ?? AlertTriangle;
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
                                        <li
                                            key={`${item.productId}-${item.batchId ?? 'all'}-${item.reasonCode}`}
                                        >
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
                                                    {item.quantity != null
                                                        ? ` · SL ${item.quantity}`
                                                        : ''}
                                                    {item.expiryDate
                                                        ? ` · HSD ${item.expiryDate}`
                                                        : ''}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
