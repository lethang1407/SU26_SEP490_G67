import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import {
    allocateQuantity, formatLocationShort, locationSummary, needsLocationPick,
    isLocationShort, pickKey, selectedKeys, selectedQuantity, toBaseUnits,
} from '../utils/cartLocation';

const fmt = (n) => Number(n ?? 0).toLocaleString('vi-VN');

export default function LocationPicker({ item, onToggle }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
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

    const options = item.locations ?? [];
    const pickedKeys = selectedKeys(item);
    const mustPick = needsLocationPick(item);
    const short = isLocationShort(item);
    const parts = allocateQuantity(item);
    const takenAt = new Map(parts.map((p) => [p.key, p.quantity]));
    const summary = locationSummary(item);

    return (
        <div className="loc-picker" ref={ref}>
            <button
                type="button"
                className={`loc-picker-btn${(mustPick || short) ? ' loc-picker-btn--warn' : ''}`}
                onClick={toggleOpen}
                disabled={options.length === 0}
                title={options.length === 0
                    ? 'Sản phẩm chưa có hàng ở vị trí nào'
                    : 'Chọn hàng để bán'}
            >
                <span className="loc-picker-label">
                    {options.length === 0 ? 'Không có hàng' : (summary ?? 'Chọn vị trí')}
                </span>
                {options.length > 0 && <ChevronDown size={13} />}
            </button>

            {open && options.length > 0 && (
                <div className={`loc-picker-panel${dropUp ? ' loc-picker-panel--up' : ''}`}>
                    {options.map((loc) => {
                        const key = pickKey(loc);
                        const taken = takenAt.get(key);
                        return (
                            <label key={key} className="loc-opt">
                                <input
                                    type="checkbox"
                                    checked={pickedKeys.includes(key)}
                                    onChange={() => onToggle(key)}
                                />
                                <span className="loc-opt-name">{formatLocationShort(loc)}</span>
                                <span className="loc-opt-qty">còn {fmt(loc.quantity)}</span>
                            </label>
                        );
                    })}
                </div>
            )}

            {/* Chia hàng khi lấy từ nhiều chỗ, để thu ngân biết lấy bao nhiêu ở đâu */}
            {!open && parts.length > 1 && (
                <div className="loc-picker-split">
                    {parts.map((p) => `${p.label}: ${fmt(p.quantity)}`).join(' · ')}
                </div>
            )}

            {options.length === 0 && (
                <div className="location-msg">Sản phẩm chưa có hàng ở vị trí nào</div>
            )}
            {options.length > 0 && mustPick && (
                <div className="location-msg">Chưa chọn vị trí lấy hàng</div>
            )}
            {short && (
                <div className="location-msg">
                    Đã chọn chỉ còn {fmt(selectedQuantity(item))} - tick thêm dòng khác
                </div>
            )}
        </div>
    );
}
