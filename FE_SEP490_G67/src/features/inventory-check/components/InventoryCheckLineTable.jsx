import { Search, Trash2 } from 'lucide-react';
import {
    enrichCheckLine,
    formatDiffQty,
    formatDiffValue,
    getDiffClassName,
} from '../utils/inventoryCheckUtils';

function rowKeyOf(line) {
    return line.id ?? `${line.productId}-${line.stockBatchId ?? 'ALL'}`;
}

export default function InventoryCheckLineTable({
    lines,
    keyword = '',
    onKeywordChange,
    editable = false,
    onActualQtyChange,
    onNoteChange,
    onRemoveLine,
    onBatchChange,
    onCancelBatch,
    onReturnBatch,
}) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filteredLines = lines.filter((line) => {
        if (!normalizedKeyword) {
            return true;
        }

        return (
            line.productCode?.toLowerCase().includes(normalizedKeyword) ||
            line.productName?.toLowerCase().includes(normalizedKeyword) ||
            line.batchCode?.toLowerCase().includes(normalizedKeyword)
        );
    });

    if (filteredLines.length === 0) {
        return (
            <div className="inventory-check-detail-card inventory-check-detail-card--empty">
                <p>
                    {editable
                        ? 'Chưa có sản phẩm nào. Tìm và thêm hàng hóa cần kiểm ở phía trên.'
                        : 'Không có dòng kiểm kê phù hợp.'}
                </p>
            </div>
        );
    }

    return (
        <div className="inventory-check-detail-card">
            <div className="inventory-check-detail-card__header">
                <h2 className="inventory-check-detail-card__title">Danh sách sản phẩm kiểm kê</h2>
                <div className="inventory-check-detail-card__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Tìm trong danh sách..."
                        value={keyword}
                        onChange={(event) => onKeywordChange?.(event.target.value)}
                    />
                </div>
            </div>

            <div className="inventory-check-line-table-wrapper">
                <table className="inventory-check-line-table">
                    <thead>
                        <tr>
                            <th>Mã SP</th>
                            <th>Tên sản phẩm</th>
                            <th>Lô</th>
                            <th>ĐVT</th>
                            <th>Tồn HT</th>
                            <th>Thực tế</th>
                            <th>Chênh lệch</th>
                            <th>Giá trị lệch</th>
                            <th>Ghi chú</th>
                            {editable ? <th aria-label="Hành động" /> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLines.map((line) => {
                            const enriched = enrichCheckLine(line);
                            const rowKey = rowKeyOf(line);
                            const hasSpecificBatch = line.stockBatchId != null;

                            return (
                                <tr key={rowKey}>
                                    <td className="inventory-check-line-table__code">
                                        {line.productCode}
                                    </td>
                                    <td className="inventory-check-line-table__name">
                                        {line.productName}
                                    </td>
                                    <td>
                                        {editable && onBatchChange ? (
                                            <select
                                                className="inventory-check-line-table__select"
                                                value={line.stockBatchId ?? 'ALL'}
                                                onChange={(event) =>
                                                    onBatchChange(rowKey, event.target.value)
                                                }
                                            >
                                                <option value="ALL">Tất cả lô</option>
                                                {(line.batches ?? []).map((batch) => (
                                                    <option key={batch.id} value={batch.id}>
                                                        {batch.batchCode} ({batch.quantity}
                                                        {batch.expiryDate
                                                            ? ` · HSD ${batch.expiryDate}`
                                                            : ''}
                                                        )
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            line.batchCode || 'Tất cả lô'
                                        )}
                                    </td>
                                    <td>{line.unit}</td>
                                    <td className="inventory-check-line-table__qty">
                                        {line.systemQty}
                                    </td>
                                    <td>
                                        {editable ? (
                                            <input
                                                type="number"
                                                min="0"
                                                className="inventory-check-line-table__input"
                                                value={line.actualQty ?? ''}
                                                onChange={(event) =>
                                                    onActualQtyChange?.(
                                                        rowKey,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        ) : (
                                            <span className="inventory-check-line-table__qty">
                                                {line.actualQty ?? '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        className={`inventory-check-line-table__diff ${getDiffClassName(enriched.diffQty)}`}
                                    >
                                        {formatDiffQty(enriched.diffQty)}
                                    </td>
                                    <td
                                        className={`inventory-check-line-table__diff ${getDiffClassName(enriched.diffValue)}`}
                                    >
                                        {formatDiffValue(enriched.diffValue)}
                                    </td>
                                    <td>
                                        {editable ? (
                                            <input
                                                type="text"
                                                className="inventory-check-line-table__input inventory-check-line-table__input--note"
                                                value={line.note ?? ''}
                                                placeholder="Ghi chú..."
                                                onChange={(event) =>
                                                    onNoteChange?.(rowKey, event.target.value)
                                                }
                                            />
                                        ) : (
                                            line.note || '—'
                                        )}
                                    </td>
                                    {editable ? (
                                        <td>
                                            <div className="inventory-check-line-table__actions">
                                                {hasSpecificBatch ? (
                                                    <div className="inventory-check-line-table__batch-actions">
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action inventory-check-line-table__action--danger"
                                                            onClick={() => onCancelBatch?.(line)}
                                                        >
                                                            Hủy lô
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action"
                                                            onClick={() => onReturnBatch?.(line)}
                                                            disabled={!line.importOrderId}
                                                            title={
                                                                line.importOrderId
                                                                    ? 'Thêm vào phiếu trả NCC'
                                                                    : 'Lô không gắn phiếu nhập'
                                                            }
                                                        >
                                                            Trả NCC
                                                        </button>
                                                    </div>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="inventory-check-line-table__remove"
                                                    title="Xóa dòng"
                                                    onClick={() => onRemoveLine?.(rowKey)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="inventory-check-line-table__hint">
                Chọn “Tất cả lô” để kiểm tổng SP, hoặc chọn từng lô. Hủy lô / Trả NCC chỉ hiện khi
                đã chọn một lô cụ thể.
            </p>
        </div>
    );
}
