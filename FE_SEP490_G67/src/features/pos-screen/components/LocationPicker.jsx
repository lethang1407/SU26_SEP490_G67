import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    allocationParts,
    capacityOf,
    formatLocationShort,
    hasLocationProblem,
    hasPickableStock,
    isExpired,
    isOverCapacity,
    locationSummary,
    orderedLocations,
    pickKey,
    qtyAt,
    unitFactor,
} from '../utils/cartLocation';

const fmt = (n) => Number(n ?? 0).toLocaleString('vi-VN');

export default function LocationPicker({ item, onPickQtyChange }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    // Bản nháp khi đang gõ: gõ dở "" hay "1" của "12" không được đẩy thẳng vào giỏ.
    const [drafts, setDrafts] = useState({});
    const ref = useRef(null);
    const toggleOpen = () => {
        if (!open) {
            const rect = ref.current?.getBoundingClientRect();
            setDropUp(rect ? window.innerHeight - rect.bottom < 300 : false);
        }
        setOpen((prev) => !prev);
    };

    useEffect(() => {
        if (!open) return undefined;
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const options = orderedLocations(item);
    const pickable = hasPickableStock(item);
    const factor = unitFactor(item);
    const problem = hasLocationProblem(item);
    const parts = allocationParts(item);
    const summary = locationSummary(item);
    const overLabels = options
        .filter((loc) => !isExpired(loc) && isOverCapacity(item, loc))
        .map(formatLocationShort);

    const dropDraft = (key) =>
        setDrafts((prev) => { const n = { ...prev }; delete n[key]; return n; });

    const commit = (key) => {
        const raw = drafts[key];
        dropDraft(key);
        if (raw === undefined) return;
        const qty = raw.trim() === '' ? 0 : Number(raw);
        if (!Number.isInteger(qty) || qty < 0) return;
        // Dòng hàng phải còn ít nhất 1 — xoá hẳn thì dùng nút thùng rác của dòng.
        const othersTotal = parts
            .filter((p) => p.key !== key)
            .reduce((sum, p) => sum + p.quantity, 0);
        if (othersTotal + qty <= 0) return;
        if (qty !== qtyAt(item, options.find((l) => pickKey(l) === key))) {
            onPickQtyChange(key, qty);
        }
    };

    let buttonLabel;
    if (options.length === 0) buttonLabel = 'Không có hàng';
    else if (!pickable) buttonLabel = 'Chỉ còn lô hết hạn';
    else buttonLabel = summary ?? 'Chọn vị trí';

    return (
        <div className="loc-picker" ref={ref}>
            <button
                type="button"
                className={`loc-picker-btn${problem ? ' loc-picker-btn--warn' : ''}`}
                onClick={toggleOpen}
                disabled={options.length === 0}
                title={options.length === 0
                    ? 'Sản phẩm chưa có hàng ở vị trí nào'
                    : 'Số lượng lấy ở từng vị trí'}
            >
                <span className="loc-picker-label">{buttonLabel}</span>
                {options.length > 0 && <ChevronDown size={13} />}
            </button>

            {open && options.length > 0 && (
                <div className={`loc-picker-panel${dropUp ? ' loc-picker-panel--up' : ''}`}>
                    {options.map((loc) => {
                        const key = pickKey(loc);
                        const expired = isExpired(loc);
                        const over = !expired && isOverCapacity(item, loc);
                        const value = drafts[key] ?? String(qtyAt(item, loc) || '');
                        return (
                            <div
                                key={key}
                                className={`loc-opt${expired ? ' loc-opt--expired' : ''}`}
                                title={expired
                                    ? `Lô ${loc.batchCode ?? ''} đã hết hạn — không bán được, báo kho xử lý`
                                    : undefined}
                            >
                                {expired && <span className="loc-expired-dot" aria-label="Lô đã hết hạn" />}
                                <span className="loc-opt-name">
                                    {formatLocationShort(loc)}
                                    {loc.expiryDate ? ` · HSD ${loc.expiryDate.slice(0, 10)}` : ''}
                                </span>
                                <span className="loc-opt-qty">
                                    {expired
                                        ? 'Hết hạn'
                                        : `còn ${fmt(loc.quantity)}${factor > 1 ? ` · tối đa ${fmt(capacityOf(item, loc))}` : ''}`}
                                </span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className={`loc-opt-input${over ? ' loc-opt-input--over' : ''}`}
                                    value={expired ? '' : value}
                                    placeholder="0"
                                    disabled={expired}
                                    aria-label={`Số lượng lấy ở ${formatLocationShort(loc)}`}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                                        }
                                    }}
                                    onBlur={() => commit(key)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {!open && parts.length > 1 && (
                <div className="loc-picker-split">
                    {parts.map((p) => `${p.label}: ${fmt(p.quantity)}`).join(' · ')}
                </div>
            )}

            {options.length === 0 && (
                <div className="location-msg">Sản phẩm chưa có hàng ở vị trí nào</div>
            )}
            {overLabels.length > 0 && (
                <div className="location-msg">
                    Vượt tồn ở {overLabels.join(', ')}
                </div>
            )}
        </div>
    );
}
