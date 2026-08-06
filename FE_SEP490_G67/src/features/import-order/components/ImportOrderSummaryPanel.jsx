import { buildImportSummary, formatCurrency } from '../utils/importOrderUtils';

export default function ImportOrderSummaryPanel({
    lines,
    note,
    editable = false,
    onNoteChange,
    onSubmit,
    submitting = false,
}) {
    const summary = buildImportSummary(lines);

    return (
        <aside className="import-order-summary-panel">
            <section className="import-order-side-card">
                <h3 className="import-order-side-card__title">Tổng kết nhập hàng</h3>
                <dl className="import-order-summary-list">
                    <div className="import-order-summary-list__item">
                        <dt>Tổng mặt hàng</dt>
                        <dd>{summary.totalLines}</dd>
                    </div>
                    <div className="import-order-summary-list__item">
                        <dt>Tổng số lượng</dt>
                        <dd>{summary.totalQuantity}</dd>
                    </div>
                </dl>
            </section>

            <section className="import-order-side-card">
                <h3 className="import-order-side-card__title">Ghi chú</h3>
                {editable ? (
                    <textarea
                        className="import-order-note-textarea"
                        rows={4}
                        value={note}
                        placeholder="Ghi chú cho phiếu nhập hàng..."
                        onChange={(event) => onNoteChange?.(event.target.value)}
                    />
                ) : (
                    <p className="import-order-note-text">{note || 'Không có ghi chú.'}</p>
                )}
            </section>

            <section className="import-order-side-card import-order-side-card--total">
                <div className="import-order-total-row">
                    <span>TỔNG CỘNG</span>
                    <strong>{formatCurrency(summary.totalCost)}</strong>
                </div>
                {editable && (
                    <>
                        <button
                            type="button"
                            className="inventory-btn inventory-btn--primary import-order-submit-btn"
                            onClick={onSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Đang lưu...' : 'Hoàn tất nhập hàng'}
                        </button>
                        <p className="import-order-submit-hint">
                            Hành động này sẽ tạo lô mới và cập nhật tồn kho.
                        </p>
                    </>
                )}
            </section>
        </aside>
    );
}
