import { Trash2 } from 'lucide-react';
import {
    formatCurrency,
    formatMoneyInput,
    parseMoneyInput,
    suggestCostForUnit,
    getLinePriceWarning,
    formatProductAttributes,
} from '../utils/importOrderUtils';

export default function ImportOrderLineTable({
    lines,
    onChangeLine,
    onRemoveLine,
    readOnly = false,
    section = 'import',
    emptyText = 'Chưa có hàng hóa nào. Tìm và chọn sản phẩm ở ô phía trên để thêm vào phiếu.',
}) {
    const canEdit = !readOnly && typeof onChangeLine === 'function';
    const canRemove = !readOnly && typeof onRemoveLine === 'function';
    const isPromoSection = section === 'promo';
    const colSpan = 8;

    const handleTogglePromotion = (line) => {
        onChangeLine(line.key, { isPromotion: !line.isPromotion });
    };

    return (
        <div className="ioc-lines-card">
            <div className="ioc-lines-wrapper">
                <table className="ioc-lines-table">
                    <thead>
                        <tr>
                            <th className="ioc-lines-table__stt">STT</th>
                            <th>Tên hàng</th>
                            <th>ĐVT</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Hạn sử dụng</th>
                            <th className="ioc-lines-table__note">Ghi chú</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && emptyText ? (
                            <tr>
                                <td colSpan={colSpan} className="ioc-lines-table__empty-cell">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : null}
                        {lines.map((line, index) => {
                            const attributeLabel = formatProductAttributes(line.attributes);
                            const isPromotion = isPromoSection || Boolean(line.isPromotion);
                            const computedTotal =
                                (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
                            const lineTotal = isPromotion ? 0 : computedTotal;
                            const noteText = line.note?.trim() || '';
                            const priceWarning = canEdit ? getLinePriceWarning(line) : null;
                            const rowClass = isPromotion
                                ? 'ioc-lines-table__row--promo'
                                : undefined;
                            const showMeta = canEdit || isPromotion;

                            return (
                                <tr key={line.key} className={rowClass}>
                                    <td className="ioc-lines-table__stt">
                                        <span className="ioc-lines-table__stt-num">{index + 1}</span>
                                        {canRemove ? (
                                            <button
                                                type="button"
                                                className="ioc-lines-table__remove"
                                                onClick={() => onRemoveLine(line.key)}
                                                title="Xóa dòng"
                                                aria-label={`Xóa ${line.productName}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : null}
                                    </td>
                                    <td>
                                        <div className="ioc-lines-table__name">{line.productName}</div>
                                        {attributeLabel ? (
                                            <div className="ioc-lines-table__attrs">{attributeLabel}</div>
                                        ) : null}
                                        {showMeta ? (
                                            <div className="ioc-line-meta">
                                                {canEdit ? (
                                                    <button
                                                        type="button"
                                                        className={`ioc-promo-chip ${
                                                            isPromotion ? 'ioc-promo-chip--on' : ''
                                                        }`}
                                                        onClick={() => handleTogglePromotion(line)}
                                                        aria-pressed={isPromotion}
                                                        title={
                                                            isPromotion
                                                                ? 'Bỏ đánh dấu hàng khuyến mãi'
                                                                : 'Đánh dấu hàng KM / trả thưởng — không thu tiền, vẫn nhập kho'
                                                        }
                                                    >
                                                        Hàng KM
                                                    </button>
                                                ) : (
                                                    <span className="ioc-promo-chip ioc-promo-chip--on">
                                                        Hàng KM
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td>
                                        {canEdit && (line.productUnits || []).length > 0 ? (
                                            <select
                                                className="ioc-lines-table__input ioc-lines-table__input--unit ioc-lines-table__select"
                                                value={line.productUnitId ?? ''}
                                                onChange={(event) => {
                                                    const nextId = Number(event.target.value);
                                                    const selected = (line.productUnits || []).find(
                                                        (unit) => unit.id === nextId,
                                                    );
                                                    onChangeLine(line.key, {
                                                        productUnitId: nextId,
                                                        unitName: selected?.name || '',
                                                        unitBase: selected?.unitBase ?? 1,
                                                        costPerUnit: suggestCostForUnit(
                                                            line.lastCostPerBase,
                                                            selected?.unitBase ?? 1,
                                                        ),
                                                    });
                                                }}
                                                aria-label={`Đơn vị tính ${line.productName}`}
                                            >
                                                {(line.productUnits || []).map((unit) => (
                                                    <option key={unit.id} value={unit.id}>
                                                        {unit.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="ioc-lines-table__unit-readonly">
                                                {line.unitName || line.unit || '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {canEdit ? (
                                            <input
                                                type="number"
                                                min="1"
                                                className="ioc-lines-table__input ioc-lines-table__input--qty"
                                                value={line.quantity}
                                                onChange={(event) =>
                                                    onChangeLine(line.key, {
                                                        quantity: Math.max(
                                                            1,
                                                            Number(event.target.value) || 1,
                                                        ),
                                                    })
                                                }
                                            />
                                        ) : (
                                            <span>{line.quantity ?? '—'}</span>
                                        )}
                                    </td>
                                    <td>
                                        {canEdit ? (
                                            <div className="ioc-lines-table__price-cell">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className={`ioc-lines-table__input ioc-lines-table__input--price${
                                                        priceWarning
                                                            ? ` ioc-lines-table__input--price-${priceWarning.level}`
                                                            : ''
                                                    }`}
                                                    value={formatMoneyInput(line.costPerUnit)}
                                                    onChange={(event) =>
                                                        onChangeLine(line.key, {
                                                            costPerUnit: parseMoneyInput(
                                                                event.target.value,
                                                            ),
                                                        })
                                                    }
                                                    aria-label={
                                                        isPromotion
                                                            ? 'Đơn giá tham chiếu (không tính tiền)'
                                                            : 'Đơn giá (VND)'
                                                    }
                                                    title={
                                                        isPromotion
                                                            ? 'Giá tham chiếu trên phiếu NCC — không tính vào tổng thanh toán'
                                                            : priceWarning?.message
                                                    }
                                                />
                                                {priceWarning ? (
                                                    <p
                                                        className={`ioc-lines-table__price-hint ioc-lines-table__price-hint--${priceWarning.level}`}
                                                    >
                                                        {priceWarning.message}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span>{formatCurrency(line.costPerUnit)}</span>
                                        )}
                                    </td>
                                    <td>
                                        {canEdit ? (
                                            <input
                                                type="date"
                                                className="ioc-lines-table__input ioc-lines-table__input--date"
                                                value={line.expiryDate}
                                                onChange={(event) =>
                                                    onChangeLine(line.key, {
                                                        expiryDate: event.target.value,
                                                    })
                                                }
                                            />
                                        ) : (
                                            <span>{line.expiryDate || '—'}</span>
                                        )}
                                    </td>
                                    <td className="ioc-lines-table__note">
                                        {canEdit ? (
                                            <input
                                                type="text"
                                                className="ioc-lines-table__input ioc-lines-table__input--note"
                                                placeholder="Ghi chú..."
                                                value={line.note || ''}
                                                onChange={(event) =>
                                                    onChangeLine(line.key, {
                                                        note: event.target.value,
                                                    })
                                                }
                                                aria-label={`Ghi chú ${line.productName}`}
                                            />
                                        ) : (
                                            <span
                                                className={
                                                    noteText ? undefined : 'ioc-lines-table__note--empty'
                                                }
                                                title={noteText || undefined}
                                            >
                                                {noteText || '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        className={`ioc-lines-table__total ${
                                            isPromotion ? 'ioc-lines-table__total--promo' : ''
                                        }`}
                                    >
                                        {isPromotion ? (
                                            <span title="Không thu tiền">0đ</span>
                                        ) : (
                                            formatCurrency(lineTotal)
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
