import { Search, Trash2 } from 'lucide-react';
import StyledSelect from '../../../components/ui/StyledSelect';
import {
    enrichCheckLine,
    formatDiffQty,
    formatDiffValue,
    getDiffClassName,
} from '../utils/inventoryCheckUtils';

function rowKeyOf(line) {
    return line.id ?? `${line.productId}-${line.locationId ?? 'LOC'}-${line.stockBatchId ?? 'BATCH'}`;
}

function batchesAtLocation(batches, locationId) {
    if (locationId == null) return [];
    return (batches ?? []).filter((b) => Number(b.locationId) === Number(locationId));
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
    onLocationChange,
    onUnitChange,
    onExchangeBatch,
    onReturnBatch,
    onCancelBatch,
}) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filteredLines = lines.filter((line) => {
        if (!normalizedKeyword) {
            return true;
        }

        return (
            line.productCode?.toLowerCase().includes(normalizedKeyword) ||
            line.productName?.toLowerCase().includes(normalizedKeyword) ||
            line.batchCode?.toLowerCase().includes(normalizedKeyword) ||
            line.locationLabel?.toLowerCase().includes(normalizedKeyword)
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
                            <th>Vị trí</th>
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
                                        {editable && onLocationChange ? (
                                            <StyledSelect
                                                value={line.locationId ?? ''}
                                                options={(line.locations ?? []).map((loc) => ({
                                                    value: loc.id,
                                                    label: loc.label,
                                                }))}
                                                onChange={(next) => onLocationChange(rowKey, next)}
                                                placeholder="Chọn vị trí"
                                            />
                                        ) : (
                                            line.locationLabel || '—'
                                        )}
                                    </td>
                                    <td>
                                        {editable && onBatchChange ? (
                                            <StyledSelect
                                                value={line.stockBatchId ?? ''}
                                                options={batchesAtLocation(
                                                    line.batches,
                                                    line.locationId,
                                                ).map((batch) => ({
                                                    value: batch.id,
                                                    label: `${batch.batchCode} (${batch.quantity}${
                                                        batch.expiryDate
                                                            ? ` · HSD ${batch.expiryDate}`
                                                            : ''
                                                    })`,
                                                }))}
                                                onChange={(next) => onBatchChange(rowKey, next)}
                                                placeholder="Chọn lô"
                                                disabled={!line.locationId}
                                                title={
                                                    batchesAtLocation(line.batches, line.locationId)
                                                        .length <= 1
                                                        ? 'Vị trí chỉ có 1 lô — đã chọn tự động'
                                                        : 'Chọn lô tại vị trí này'
                                                }
                                            />
                                        ) : (
                                            line.batchCode || '—'
                                        )}
                                    </td>
                                    <td>
                                        {editable && onUnitChange && (line.units?.length ?? 0) > 1 ? (
                                            <StyledSelect
                                                value={line.selectedUnitId ?? line.units?.[0]?.id}
                                                options={(line.units ?? []).map((unit) => ({
                                                    value: unit.id,
                                                    label: unit.name,
                                                }))}
                                                onChange={(next) => onUnitChange(rowKey, next)}
                                            />
                                        ) : (
                                            line.unit
                                        )}
                                    </td>
                                    <td className="inventory-check-line-table__qty">
                                        {line.systemQty}
                                    </td>
                                    <td>
                                        {editable && hasSpecificBatch ? (
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
                                            <span
                                                className="inventory-check-line-table__qty"
                                                title={
                                                    editable && !hasSpecificBatch
                                                        ? 'Chọn một lô cụ thể để chỉnh tồn thực tế'
                                                        : undefined
                                                }
                                            >
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
                                                {hasSpecificBatch && !line.isTrial ? (
                                                    <div className="inventory-check-line-table__batch-actions">
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action inventory-check-line-table__action--success"
                                                            onClick={() => onExchangeBatch?.(line)}
                                                            disabled={
                                                                !line.importOrderId ||
                                                                Number(line.actualQty) < 1
                                                            }
                                                            title={
                                                                !line.importOrderId
                                                                    ? 'Lô không gắn phiếu nhập'
                                                                    : Number(line.actualQty) < 1
                                                                      ? 'Đã trả/đổi hết số lượng còn lại'
                                                                      : 'Thêm vào phiếu đổi cho NCC'
                                                            }
                                                        >
                                                            Đổi cho NCC
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action inventory-check-line-table__action--danger"
                                                            onClick={() => onReturnBatch?.(line)}
                                                            disabled={
                                                                !line.importOrderId ||
                                                                Number(line.actualQty) < 1
                                                            }
                                                            title={
                                                                !line.importOrderId
                                                                    ? 'Lô không gắn phiếu nhập'
                                                                    : Number(line.actualQty) < 1
                                                                      ? 'Đã trả/đổi hết số lượng còn lại'
                                                                      : 'Thêm vào phiếu trả NCC'
                                                            }
                                                        >
                                                            Trả NCC
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action inventory-check-line-table__action--warning"
                                                            onClick={() => onCancelBatch?.(line)}
                                                            disabled={Number(line.systemQty) < 1}
                                                            title={
                                                                Number(line.systemQty) < 1
                                                                    ? 'Không còn tồn để hủy'
                                                                    : 'Hủy hàng (ghi giảm tồn, không trả NCC)'
                                                            }
                                                        >
                                                            Hủy hàng
                                                        </button>
                                                    </div>
                                                ) : hasSpecificBatch && line.isTrial ? (
                                                    <div className="inventory-check-line-table__batch-actions">
                                                        <span
                                                            className="text-muted"
                                                            title="Hàng bán thử quyết toán trên phiếu nhập"
                                                        >
                                                            Bán thử
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="inventory-check-line-table__action inventory-check-line-table__action--warning"
                                                            onClick={() => onCancelBatch?.(line)}
                                                            disabled={Number(line.systemQty) < 1}
                                                            title={
                                                                Number(line.systemQty) < 1
                                                                    ? 'Không còn tồn để hủy'
                                                                    : 'Hủy hàng (ghi giảm tồn, không trả NCC)'
                                                            }
                                                        >
                                                            Hủy hàng
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
        </div>
    );
}
