import { formatDateTime, formatCurrency, buildCheckSummary } from '../utils/inventoryCheckUtils';

export function InventoryCheckInfoPanel({ check }) {
    if (!check) {
        return null;
    }

    return (
        <section className="inventory-check-side-card">
            <h3 className="inventory-check-side-card__title">Thông tin chung</h3>
            <dl className="inventory-check-info-list">
                <div className="inventory-check-info-list__item">
                    <dt>Mã phiếu</dt>
                    <dd>{check.code}</dd>
                </div>
                <div className="inventory-check-info-list__item">
                    <dt>Kho kiểm</dt>
                    <dd>{check.warehouse}</dd>
                </div>
                <div className="inventory-check-info-list__item">
                    <dt>Thời gian tạo</dt>
                    <dd>{formatDateTime(check.createdAt)}</dd>
                </div>
                <div className="inventory-check-info-list__item">
                    <dt>Người tạo</dt>
                    <dd>{check.createdBy}</dd>
                </div>
                <div className="inventory-check-info-list__item">
                    <dt>Ngày kiểm</dt>
                    <dd>{formatDateTime(check.checkDate)}</dd>
                </div>
                <div className="inventory-check-info-list__item">
                    <dt>Người kiểm</dt>
                    <dd>{check.checker}</dd>
                </div>
            </dl>
        </section>
    );
}

export function InventoryCheckSummaryPanel({ lines }) {
    const summary = buildCheckSummary(lines);

    return (
        <section className="inventory-check-side-card">
            <h3 className="inventory-check-side-card__title">Tóm tắt kiểm kho</h3>
            <dl className="inventory-check-summary-list">
                <div className="inventory-check-summary-list__item">
                    <dt>Số sản phẩm kiểm</dt>
                    <dd>{summary.totalLines}</dd>
                </div>
                <div className="inventory-check-summary-list__item inventory-check-summary-list__item--highlight">
                    <dt>Chênh lệch số lượng</dt>
                    <dd
                        className={
                            summary.totalDiffQty < 0
                                ? 'inventory-check-diff--negative'
                                : summary.totalDiffQty > 0
                                  ? 'inventory-check-diff--positive'
                                  : ''
                        }
                    >
                        {summary.totalDiffQty ?? '—'}
                    </dd>
                </div>
                <div className="inventory-check-summary-list__item inventory-check-summary-list__item--highlight">
                    <dt>Giá trị chênh lệch</dt>
                    <dd
                        className={
                            summary.totalDiffValue < 0
                                ? 'inventory-check-diff--negative'
                                : summary.totalDiffValue > 0
                                  ? 'inventory-check-diff--positive'
                                  : ''
                        }
                    >
                        {summary.totalDiffValue !== null
                            ? formatCurrency(summary.totalDiffValue)
                            : '—'}
                    </dd>
                </div>
            </dl>
        </section>
    );
}

export function InventoryCheckNotePanel({ note, editable = false, onChange }) {
    return (
        <section className="inventory-check-side-card">
            <h3 className="inventory-check-side-card__title">Ghi chú</h3>
            {editable ? (
                <textarea
                    className="inventory-check-note-textarea"
                    rows={4}
                    value={note}
                    placeholder="Ghi chú chung cho phiếu kiểm kho..."
                    onChange={(event) => onChange?.(event.target.value)}
                />
            ) : (
                <p className="inventory-check-note-text">{note || 'Không có ghi chú.'}</p>
            )}
        </section>
    );
}
