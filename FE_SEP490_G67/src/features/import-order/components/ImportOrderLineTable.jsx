import { Minus, Plus, Trash2 } from 'lucide-react';
import DatePickerInput from '../../../components/ui/DatePickerInput';
import {
    formatCurrency,
    formatMoneyInput,
    parseMoneyInput,
    parseQtyInput,
    normalizeQty,
    MAX_IMPORT_QUANTITY,
    suggestCostForUnit,
    getLinePriceWarning,
    resolveLineType,
    computeDisplayLineTotal,
    describeSettledTrial,
    settlementLineByDetailId,
} from '../utils/importOrderUtils';

function bumpQty(current, delta) {
    return Math.min(MAX_IMPORT_QUANTITY, Math.max(1, normalizeQty(current) + delta));
}

export default function ImportOrderLineTable({
    lines,
    onChangeLine,
    onRemoveLine,
    readOnly = false,
    section = 'import',
    emptyText = 'Chưa có hàng hóa nào. Tìm và chọn sản phẩm ở ô phía trên để thêm vào phiếu.',
    trialSettlements = [],
}) {
    const canEdit = !readOnly && typeof onChangeLine === 'function';
    const canRemove = !readOnly && typeof onRemoveLine === 'function';
    const isPromoSection = section === 'promo';
    const colSpan = 8;
    const settleByDetailId = settlementLineByDetailId(trialSettlements);

    const handleToggleLineType = (line, nextType) => {
        const current = resolveLineType(line);
        const lineType = current === nextType ? 'REGULAR' : nextType;
        onChangeLine(line.key, {
            lineType,
            isPromotion: lineType === 'PROMOTION',
            isTrial: lineType === 'TRIAL',
        });
    };

    return (
        <div className="ioc-lines-card">
            <div className="ioc-lines-wrapper">
                <table className="ioc-lines-table">
                    <colgroup>
                        <col className="ioc-lines-table__col--stt" />
                        <col className="ioc-lines-table__col--name" />
                        <col className="ioc-lines-table__col--unit" />
                        <col className="ioc-lines-table__col--qty" />
                        <col className="ioc-lines-table__col--price" />
                        <col className="ioc-lines-table__col--date" />
                        <col className="ioc-lines-table__col--note" />
                        <col className="ioc-lines-table__col--total" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="ioc-lines-table__stt">STT</th>
                            <th className="ioc-lines-table__col--name">Tên hàng</th>
                            <th className="ioc-lines-table__col--unit">ĐVT</th>
                            <th className="ioc-lines-table__col--qty">Số lượng</th>
                            <th className="ioc-lines-table__col--price">Đơn giá *</th>
                            <th className="ioc-lines-table__col--date">Hạn sử dụng</th>
                            <th className="ioc-lines-table__note">Ghi chú</th>
                            <th className="ioc-lines-table__col--total">Thành tiền</th>
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
                            const lineType = isPromoSection ? 'PROMOTION' : resolveLineType(line);
                            const isPromotion = lineType === 'PROMOTION';
                            const isTrial = lineType === 'TRIAL';
                            const computedTotal = computeDisplayLineTotal({
                                ...line,
                                lineType,
                                isPromotion,
                                isTrial,
                            });
                            const missingExpiry = !String(line.expiryDate || '').trim();
                            const displayTotal = isPromotion ? 0 : computedTotal;
                            const noteText = line.note?.trim() || '';
                            const costValue = Number(line.costPerUnit) || 0;
                            const priceWarning = canEdit ? getLinePriceWarning(line) : null;
                            const rowClass = isTrial
                                ? 'ioc-lines-table__row--trial'
                                : isPromotion
                                  ? 'ioc-lines-table__row--promo'
                                  : undefined;
                            const showMeta = canEdit || isPromotion || isTrial;
                            const canMarkTrial = !Boolean(line.alreadyInStore);

                            return (
                                <tr key={line.key ?? line.id} className={rowClass}>
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
                                    <td className="ioc-lines-table__col--name">
                                        <div className="ioc-lines-table__name">{line.productName}</div>
                                        {showMeta ? (
                                            <div className="ioc-line-meta">
                                                {canEdit ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={`ioc-promo-chip ${
                                                                isPromotion ? 'ioc-promo-chip--on' : ''
                                                            }`}
                                                            onClick={() =>
                                                                handleToggleLineType(line, 'PROMOTION')
                                                            }
                                                            aria-pressed={isPromotion}
                                                            title={
                                                                isPromotion
                                                                    ? 'Bỏ đánh dấu hàng khuyến mãi'
                                                                    : 'Đánh dấu hàng KM / trả thưởng — không thu tiền, vẫn nhập kho'
                                                            }
                                                        >
                                                            Hàng KM
                                                        </button>
                                                        {canMarkTrial || isTrial ? (
                                                            <button
                                                                type="button"
                                                                className={`ioc-promo-chip ioc-trial-chip ${
                                                                    isTrial ? 'ioc-trial-chip--on' : ''
                                                                }`}
                                                                onClick={() =>
                                                                    handleToggleLineType(line, 'TRIAL')
                                                                }
                                                                aria-pressed={isTrial}
                                                                title={
                                                                    isTrial
                                                                        ? 'Bỏ đánh dấu hàng bán thử'
                                                                        : 'Hàng bán thử — chỉ cho sản phẩm mới, chưa từng có ở cửa hàng'
                                                                }
                                                            >
                                                                Bán thử
                                                            </button>
                                                        ) : null}
                                                    </>
                                                ) : isTrial ? (
                                                    <>
                                                        <span className={`ioc-promo-chip ioc-trial-chip ioc-trial-chip--on${
                                                            line.trialStatus === 'SETTLED'
                                                                ? ' ioc-trial-chip--settled'
                                                                : ''
                                                        }`}>
                                                            {line.trialStatus === 'SETTLED'
                                                                ? 'Bán thử · đã quyết toán'
                                                                : 'Bán thử'}
                                                        </span>
                                                        {line.trialStatus === 'SETTLED' ? (
                                                            <span className="import-order-expand__settle-note">
                                                                {describeSettledTrial(
                                                                    line,
                                                                    settleByDetailId.get(line.id),
                                                                )}
                                                            </span>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    <span className="ioc-promo-chip ioc-promo-chip--on">
                                                        Hàng KM
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="ioc-lines-table__col--unit">
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
                                    <td className="ioc-lines-table__col--qty">
                                        {canEdit ? (
                                            <div className="ioc-lines-table__qty-stepper">
                                                <button
                                                    type="button"
                                                    className="ioc-lines-table__qty-btn"
                                                    disabled={normalizeQty(line.quantity) <= 1}
                                                    onClick={() =>
                                                        onChangeLine(line.key, {
                                                            quantity: bumpQty(line.quantity, -1),
                                                        })
                                                    }
                                                    aria-label={`Giảm số lượng ${line.productName}`}
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    className="ioc-lines-table__input ioc-lines-table__input--qty"
                                                    value={line.quantity ?? ''}
                                                    onChange={(event) =>
                                                        onChangeLine(line.key, {
                                                            quantity: parseQtyInput(event.target.value),
                                                        })
                                                    }
                                                    onBlur={(event) =>
                                                        onChangeLine(line.key, {
                                                            quantity: normalizeQty(
                                                                parseQtyInput(event.target.value),
                                                            ),
                                                        })
                                                    }
                                                    aria-label={`Số lượng ${line.productName}`}
                                                />
                                                <button
                                                    type="button"
                                                    className="ioc-lines-table__qty-btn"
                                                    disabled={
                                                        normalizeQty(line.quantity) >= MAX_IMPORT_QUANTITY
                                                    }
                                                    onClick={() =>
                                                        onChangeLine(line.key, {
                                                            quantity: bumpQty(line.quantity, 1),
                                                        })
                                                    }
                                                    aria-label={`Tăng số lượng ${line.productName}`}
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span>{line.quantity ?? '—'}</span>
                                        )}
                                    </td>
                                    <td className="ioc-lines-table__col--price">
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
                                                    value={
                                                        !isPromotion && costValue <= 0
                                                            ? ''
                                                            : formatMoneyInput(line.costPerUnit)
                                                    }
                                                    placeholder={isPromotion ? '0' : 'Nhập giá'}
                                                    onChange={(event) =>
                                                        onChangeLine(line.key, {
                                                            costPerUnit: parseMoneyInput(
                                                                event.target.value,
                                                            ),
                                                        })
                                                    }
                                                    aria-invalid={
                                                        priceWarning?.level === 'danger' ? true : undefined
                                                    }
                                                    aria-label={
                                                        isTrial
                                                            ? 'Giá thỏa thuận (quyết toán sau)'
                                                            : isPromotion
                                                              ? 'Đơn giá tham chiếu (không tính tiền)'
                                                              : 'Đơn giá (VND)'
                                                    }
                                                    title={
                                                        isTrial
                                                            ? 'Giá thỏa thuận với nhân viên NCC — chưa thu lúc nhận'
                                                            : isPromotion
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
                                    <td className="ioc-lines-table__col--date">
                                        {canEdit ? (
                                            <DatePickerInput
                                                value={line.expiryDate || ''}
                                                className={`ioc-lines-table__input ioc-lines-table__input--date${
                                                    missingExpiry
                                                        ? ' ioc-lines-table__input--date-warn'
                                                        : ''
                                                }`}
                                                onChange={(nextValue) =>
                                                    onChangeLine(line.key, {
                                                        expiryDate: nextValue,
                                                    })
                                                }
                                                title={missingExpiry ? 'Chưa nhập hạn sử dụng' : undefined}
                                                ariaLabel={
                                                    missingExpiry
                                                        ? `Hạn sử dụng ${line.productName} (chưa nhập)`
                                                        : `Hạn sử dụng ${line.productName}`
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
                                            isTrial
                                                ? 'ioc-lines-table__total--trial'
                                                : isPromotion
                                                  ? 'ioc-lines-table__total--promo'
                                                  : ''
                                        }`}
                                    >
                                        {isPromotion ? (
                                            <span title="Không thu tiền">0đ</span>
                                        ) : (
                                            <span
                                                title={
                                                    isTrial && line.trialStatus === 'SETTLED'
                                                        ? 'Giá trị lúc nhận (số lượng × đơn giá)'
                                                        : isTrial
                                                          ? 'Giá trị thỏa thuận — đã ghi vào công nợ NCC'
                                                          : undefined
                                                }
                                            >
                                                {formatCurrency(displayTotal)}
                                            </span>
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
