import { buildReturnSummary, formatCurrency } from '../utils/importReturnUtils';

export default function ImportReturnSummaryPanel({
    lines,
    note,
    onNoteChange,
    onSubmit,
    submitting = false,
}) {
    const summary = buildReturnSummary(lines);

    return (
        <aside className="import-return-summary-panel">
            <section className="import-return-side-card">
                <h3 className="import-return-side-card__title">Tổng kết trả hàng</h3>
                <dl className="import-return-summary-list">
                    <div className="import-return-summary-list__item">
                        <dt>Số loại mặt hàng</dt>
                        <dd>{summary.totalLines}</dd>
                    </div>
                    <div className="import-return-summary-list__item">
                        <dt>Tổng số lượng</dt>
                        <dd>{summary.totalQuantity}</dd>
                    </div>
                </dl>

                <label className="import-return-note-label" htmlFor="import-return-note">
                    Ghi chú trả hàng
                </label>
                <textarea
                    id="import-return-note"
                    className="import-return-note-textarea"
                    rows={4}
                    value={note}
                    placeholder="Lý do trả hàng, tình trạng sản phẩm..."
                    onChange={(event) => onNoteChange?.(event.target.value)}
                />

                <div className="import-return-total-row">
                    <span>TỔNG CỘNG:</span>
                    <strong>{formatCurrency(summary.totalRefund)}</strong>
                </div>

                <button
                    type="button"
                    className="inventory-btn import-return-submit-btn"
                    onClick={onSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Đang lưu...' : 'Hoàn tất trả hàng'}
                </button>
            </section>
        </aside>
    );
}
