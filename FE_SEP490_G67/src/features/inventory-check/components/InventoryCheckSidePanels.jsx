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

function SummaryField({ label, children, className = '', required = false }) {
    return (
        <div className={`inventory-check-summary-field ${className}`.trim()}>
            <span className="inventory-check-summary-field__label">
                {label}
                {required ? <span className="inventory-check-summary-field__required"> *</span> : null}
            </span>
            <div className="inventory-check-summary-field__box">{children}</div>
        </div>
    );
}

function toDateInputValue(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateOnly(value) {
    const input = toDateInputValue(value);
    if (!input) return '—';
    const [y, m, d] = input.split('-');
    return `${d}/${m}/${y}`;
}

export function InventoryCheckSummaryPanel({
    lines,
    note,
    noteEditable = false,
    onNoteChange,
    showNote = false,
    checkDate,
    checkerName,
    showMeta = false,
}) {
    const summary = buildCheckSummary(lines);
    const includeNote = showNote || noteEditable || note !== undefined;
    const includeMeta =
        showMeta ||
        checkDate !== undefined ||
        checkerName !== undefined;

    const diffQtyClass =
        summary.totalDiffQty < 0
            ? 'inventory-check-diff--negative'
            : summary.totalDiffQty > 0
              ? 'inventory-check-diff--positive'
              : '';
    const diffValueClass =
        summary.totalDiffValue < 0
            ? 'inventory-check-diff--negative'
            : summary.totalDiffValue > 0
              ? 'inventory-check-diff--positive'
              : '';

    return (
        <section className="inventory-check-side-card inventory-check-summary-card">
            <h3 className="inventory-check-side-card__title">Tóm tắt kiểm kho</h3>
            <div className="inventory-check-summary-fields">
                {includeMeta ? (
                    <>
                        <SummaryField label="Ngày kiểm kê" required>
                            <span className="inventory-check-summary-field__value">
                                {formatDateOnly(checkDate)}
                            </span>
                        </SummaryField>
                        <SummaryField label="Người kiểm kê">
                            <span className="inventory-check-summary-field__value">
                                {checkerName || '—'}
                            </span>
                        </SummaryField>
                    </>
                ) : null}
                <SummaryField label="Số sản phẩm chênh lệch">
                    <span className="inventory-check-summary-field__value">
                        {summary.countedLines === summary.totalLines
                            ? summary.mismatchLineCount
                            : '—'}
                    </span>
                </SummaryField>
                <SummaryField label="Chênh lệch số lượng">
                    <span className={`inventory-check-summary-field__value ${diffQtyClass}`.trim()}>
                        {summary.totalDiffQty ?? '—'}
                    </span>
                </SummaryField>
                <SummaryField label="Giá trị chênh lệch">
                    <span
                        className={`inventory-check-summary-field__value ${diffValueClass}`.trim()}
                    >
                        {summary.totalDiffValue !== null
                            ? formatCurrency(summary.totalDiffValue)
                            : '—'}
                    </span>
                </SummaryField>
                {includeNote ? (
                    <SummaryField
                        label="Ghi chú"
                        className="inventory-check-summary-field--note"
                    >
                        {noteEditable ? (
                            <textarea
                                className="inventory-check-summary-field__textarea"
                                rows={3}
                                value={note ?? ''}
                                placeholder="Ghi chú phiếu kiểm kê..."
                                onChange={(event) => onNoteChange?.(event.target.value)}
                            />
                        ) : (
                            <span className="inventory-check-summary-field__value inventory-check-summary-field__value--note">
                                {note || 'Không có ghi chú.'}
                            </span>
                        )}
                    </SummaryField>
                ) : null}
            </div>
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
