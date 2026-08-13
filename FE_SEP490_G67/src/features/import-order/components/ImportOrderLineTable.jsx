import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
}) {
    const [openNoteKey, setOpenNoteKey] = useState(null);
    const noteEditorRef = useRef(null);
    const canEdit = !readOnly && typeof onChangeLine === 'function';
    const canRemove = !readOnly && typeof onRemoveLine === 'function';

    useEffect(() => {
        if (!openNoteKey) return undefined;

        const handleClickOutside = (event) => {
            if (noteEditorRef.current && !noteEditorRef.current.contains(event.target)) {
                setOpenNoteKey(null);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpenNoteKey(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [openNoteKey]);

    const handleTogglePromotion = (line) => {
        const next = !line.isPromotion;
        const patch = { isPromotion: next };
        if (next && !line.note?.trim()) {
            patch.note = 'Hàng khuyến mãi';
        }
        onChangeLine(line.key, patch);
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
                            <th>Thành tiền</th>
                            <th aria-label="Xóa" />
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={8} className="ioc-lines-table__empty-cell">
                                    Chưa có hàng hóa nào. Tìm và chọn sản phẩm ở ô phía trên để thêm vào phiếu.
                                </td>
                            </tr>
                        )}
                        {lines.map((line, index) => {
                            const attributeLabel = formatProductAttributes(line.attributes);
                            const isPromotion = Boolean(line.isPromotion);
                            const lineTotal = isPromotion
                                ? 0
                                : (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
                            const hasNote = Boolean(line.note?.trim());
                            const isNoteOpen = openNoteKey === line.key;
                            const priceWarning = canEdit ? getLinePriceWarning(line) : null;

                            return (
                                <tr
                                    key={line.key}
                                    className={isPromotion ? 'ioc-lines-table__row--promo' : undefined}
                                >
                                    <td className="ioc-lines-table__stt">{index + 1}</td>
                                    <td>
                                        <div className="ioc-lines-table__name">{line.productName}</div>
                                        {attributeLabel ? (
                                            <div className="ioc-lines-table__attrs">{attributeLabel}</div>
                                        ) : null}
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
                                            ) : isPromotion ? (
                                                <span className="ioc-promo-chip ioc-promo-chip--on">Hàng KM</span>
                                            ) : null}

                                            {canEdit ? (
                                                <div className="ioc-line-note">
                                                    <button
                                                        type="button"
                                                        className={`ioc-line-note__trigger ${
                                                            hasNote ? 'ioc-line-note__trigger--filled' : ''
                                                        }`}
                                                        onClick={() =>
                                                            setOpenNoteKey((prev) =>
                                                                prev === line.key ? null : line.key,
                                                            )
                                                        }
                                                    >
                                                        <span className="ioc-line-note__preview">
                                                            {hasNote ? line.note : 'Ghi chú...'}
                                                        </span>
                                                        <Pencil size={13} className="ioc-line-note__icon" />
                                                    </button>

                                                    {isNoteOpen && (
                                                        <div
                                                            className="ioc-line-note__popover"
                                                            ref={noteEditorRef}
                                                        >
                                                            <textarea
                                                                className="ioc-line-note__textarea"
                                                                rows={3}
                                                                autoFocus
                                                                placeholder="VD: Trả thưởng - HBTB0526"
                                                                value={line.note}
                                                                onChange={(event) =>
                                                                    onChangeLine(line.key, {
                                                                        note: event.target.value,
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : hasNote ? (
                                                <span className="ioc-line-note__preview">{line.note}</span>
                                            ) : null}
                                        </div>
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
                                    <td>
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
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
