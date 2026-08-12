import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/inventoryCheckUtils';

export default function InventoryCheckReturnDraftPanel({
    draft,
    loading = false,
    committing = false,
    onRemoveLine,
    onCommit,
    showCommit = true,
    emptyHint = 'Chưa có dòng.',
}) {
    const lines = draft?.lines ?? [];

    if (loading) {
        return (
            <section className="inventory-check-side-card">
                <h3 className="inventory-check-side-card__title">Đổi trả NCC (nháp)</h3>
                <p className="inventory-check-side-card__hint">Đang tải...</p>
            </section>
        );
    }

    return (
        <section className="inventory-check-side-card inventory-check-return-draft">
            <h3 className="inventory-check-side-card__title">Đổi trả NCC (nháp)</h3>
            {lines.length === 0 ? (
                <p className="inventory-check-side-card__hint">{emptyHint}</p>
            ) : (
                <>
                    <ul className="inventory-check-return-draft__list">
                        {lines.map((line) => (
                            <li
                                key={line.detailId ?? line.localKey}
                                className="inventory-check-return-draft__item"
                            >
                                <div className="inventory-check-return-draft__meta">
                                    <strong>{line.productName}</strong>
                                    <span>
                                        {line.method === 'EXCHANGE' ? 'Đổi' : 'Trả'}
                                        {line.batchCode ? ` · ${line.batchCode}` : ''}
                                        {line.supplierName ? ` · ${line.supplierName}` : ''}
                                    </span>
                                    <span>
                                        SL: {line.quantity}
                                        {line.returnReason ? ` · ${line.returnReason}` : ''}
                                    </span>
                                    <span>
                                        {formatCurrency(
                                            Number(line.quantity || 0) * Number(line.returnPrice || 0),
                                        )}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="inventory-check-line-table__remove"
                                    title="Xóa dòng"
                                    onClick={() =>
                                        onRemoveLine?.(line.detailId ?? line.localKey)
                                    }
                                    disabled={committing}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="inventory-check-return-draft__footer">
                        <div className="inventory-check-return-draft__total">
                            Tổng:{' '}
                            <strong>{formatCurrency(draft?.totalRefund ?? 0)}</strong>
                        </div>
                        {showCommit ? (
                            <button
                                type="button"
                                className="inventory-btn inventory-btn--primary"
                                onClick={() => onCommit?.(draft?.id)}
                                disabled={committing || !draft?.id}
                            >
                                {committing ? 'Đang xác nhận...' : 'Xác nhận đổi trả'}
                            </button>
                        ) : null}
                    </div>
                </>
            )}
        </section>
    );
}
