import { Search } from 'lucide-react';
import {
    enrichCheckLine,
    formatCurrency,
    formatDiffQty,
    formatDiffValue,
    getDiffClassName,
} from '../utils/inventoryCheckUtils';

export default function InventoryCheckLineTable({
    lines,
    keyword = '',
    onKeywordChange,
    editable = false,
    onActualQtyChange,
    onNoteChange,
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
                <p>Không có dòng kiểm kê phù hợp.</p>
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
                        placeholder="Tìm kiếm sản phẩm, lô, vị trí..."
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
                            <th>Số lô</th>
                            <th>Vị trí kệ</th>
                            <th>ĐVT</th>
                            <th>Tồn HT</th>
                            <th>Thực tế</th>
                            <th>Chênh lệch</th>
                            <th>Giá trị lệch</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLines.map((line) => {
                            const enriched = enrichCheckLine(line);

                            return (
                                <tr key={line.id}>
                                    <td className="inventory-check-line-table__code">
                                        {line.productCode}
                                    </td>
                                    <td className="inventory-check-line-table__name">
                                        {line.productName}
                                    </td>
                                    <td>
                                        <span className="inventory-check-batch-cell">
                                            {line.batchCode}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="inventory-check-location-cell">
                                            {line.locationLabel}
                                        </span>
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
                                                        line.id,
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
                                                    onNoteChange?.(line.id, event.target.value)
                                                }
                                            />
                                        ) : (
                                            line.note || '—'
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="inventory-check-line-table__hint">
                Mỗi dòng = 1 lô tại 1 vị trí kệ. Mỗi kệ chỉ chứa một loại sản phẩm; cùng SP
                nhưng khác lô hoặc khác kệ sẽ là các dòng riêng.
            </p>
        </div>
    );
}
