import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toIso(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseIso(value) {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function formatVn(date) {
    if (!date) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, count) {
    return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function sameDay(a, b) {
    if (!a || !b) return false;
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function isBetween(day, from, to) {
    if (!from || !to) return false;
    const t = day.getTime();
    const a = Math.min(from.getTime(), to.getTime());
    const b = Math.max(from.getTime(), to.getTime());
    return t > a && t < b;
}

function buildMonthCells(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first: JS getDay() Sun=0 → convert to Mon=0
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < 42; i += 1) {
        const dayNum = i - startOffset + 1;
        let date;
        let inMonth = true;
        if (dayNum < 1) {
            date = new Date(year, month - 1, prevMonthDays + dayNum);
            inMonth = false;
        } else if (dayNum > daysInMonth) {
            date = new Date(year, month + 1, dayNum - daysInMonth);
            inMonth = false;
        } else {
            date = new Date(year, month, dayNum);
        }
        cells.push({ date, inMonth });
    }
    return cells;
}

function MonthCalendar({ monthDate, fromDate, toDate, onSelectDay, onPrev, onNext }) {
    const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
    const title = `Tháng ${monthDate.getMonth() + 1} ${monthDate.getFullYear()}`;

    return (
        <div className="io-daterange__month">
            <div className="io-daterange__month-nav">
                <button type="button" className="io-daterange__nav-btn" onClick={onPrev} aria-label="Tháng trước">
                    <ChevronLeft size={18} />
                </button>
                <span className="io-daterange__month-title">{title}</span>
                <button type="button" className="io-daterange__nav-btn" onClick={onNext} aria-label="Tháng sau">
                    <ChevronRight size={18} />
                </button>
            </div>
            <div className="io-daterange__weekdays">
                {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                ))}
            </div>
            <div className="io-daterange__days">
                {cells.map(({ date, inMonth }) => {
                    const isFrom = sameDay(date, fromDate);
                    const isTo = sameDay(date, toDate);
                    const inRange = isBetween(date, fromDate, toDate);
                    const className = [
                        'io-daterange__day',
                        !inMonth ? 'io-daterange__day--muted' : '',
                        isFrom || isTo ? 'io-daterange__day--selected' : '',
                        inRange ? 'io-daterange__day--in-range' : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <button
                            key={toIso(date)}
                            type="button"
                            className={className}
                            onClick={() => onSelectDay(date)}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function ImportOrderDateRangePicker({ fromDate = '', toDate = '', onApply }) {
    const rootRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState(null);
    const [draftTo, setDraftTo] = useState(null);
    const [leftMonth, setLeftMonth] = useState(() => startOfMonth(new Date()));

    const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

    const appliedLabel = useMemo(() => {
        if (!fromDate && !toDate) return 'Chọn khoảng ngày';
        const from = parseIso(fromDate);
        const to = parseIso(toDate);
        if (from && to && sameDay(from, to)) return formatVn(from);
        return `${from ? formatVn(from) : '…'} – ${to ? formatVn(to) : '…'}`;
    }, [fromDate, toDate]);

    const openPopup = () => {
        const from = parseIso(fromDate);
        const to = parseIso(toDate);
        setDraftFrom(from);
        setDraftTo(to);
        setLeftMonth(startOfMonth(from || to || new Date()));
        setOpen(true);
    };

    const closePopup = () => setOpen(false);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointer = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const handleSelectDay = (day) => {
        if (!draftFrom || (draftFrom && draftTo)) {
            setDraftFrom(day);
            setDraftTo(null);
            return;
        }
        if (day.getTime() < draftFrom.getTime()) {
            setDraftTo(draftFrom);
            setDraftFrom(day);
            return;
        }
        setDraftTo(day);
    };

    const setPreset = (from, to) => {
        setDraftFrom(from);
        setDraftTo(to);
        setLeftMonth(startOfMonth(from));
    };

    const handleToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setPreset(today, today);
    };

    const handleYesterday = () => {
        const yesterday = new Date();
        yesterday.setHours(0, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);
        setPreset(yesterday, yesterday);
    };

    const handleApply = () => {
        const from = draftFrom;
        const to = draftTo || draftFrom;
        onApply?.({
            fromDate: from ? toIso(from) : '',
            toDate: to ? toIso(to) : '',
        });
        setOpen(false);
    };

    const handleClear = () => {
        onApply?.({ fromDate: '', toDate: '' });
        setOpen(false);
    };

    return (
        <div className="io-daterange" ref={rootRef}>
            <button
                type="button"
                className={`io-daterange__trigger ${fromDate || toDate ? 'io-daterange__trigger--active' : ''}`}
                onClick={() => (open ? closePopup() : openPopup())}
                aria-expanded={open}
            >
                <CalendarDays size={16} />
                <span>{appliedLabel}</span>
            </button>

            {(fromDate || toDate) && (
                <button
                    type="button"
                    className="io-daterange__clear"
                    onClick={handleClear}
                    title="Xóa lọc ngày"
                    aria-label="Xóa lọc ngày"
                >
                    <X size={14} />
                </button>
            )}

            {open && (
                <div className="io-daterange__popup" role="dialog" aria-label="Lọc theo khoảng ngày">
                    <div className="io-daterange__popup-header">
                        Từ ngày: <strong>{formatVn(draftFrom)}</strong>
                        {' - '}
                        Đến ngày: <strong>{formatVn(draftTo || draftFrom)}</strong>
                    </div>

                    <div className="io-daterange__calendars">
                        <MonthCalendar
                            monthDate={leftMonth}
                            fromDate={draftFrom}
                            toDate={draftTo || draftFrom}
                            onSelectDay={handleSelectDay}
                            onPrev={() => setLeftMonth((prev) => addMonths(prev, -1))}
                            onNext={() => setLeftMonth((prev) => addMonths(prev, 1))}
                        />
                        <MonthCalendar
                            monthDate={rightMonth}
                            fromDate={draftFrom}
                            toDate={draftTo || draftFrom}
                            onSelectDay={handleSelectDay}
                            onPrev={() => setLeftMonth((prev) => addMonths(prev, -1))}
                            onNext={() => setLeftMonth((prev) => addMonths(prev, 1))}
                        />
                    </div>

                    <div className="io-daterange__footer">
                        <div className="io-daterange__presets">
                            <button type="button" className="io-daterange__preset" onClick={handleToday}>
                                Hôm nay
                            </button>
                            <button type="button" className="io-daterange__preset" onClick={handleYesterday}>
                                Hôm qua
                            </button>
                        </div>
                        <div className="io-daterange__actions">
                            <button type="button" className="io-daterange__btn io-daterange__btn--ghost" onClick={closePopup}>
                                Bỏ qua
                            </button>
                            <button
                                type="button"
                                className="io-daterange__btn io-daterange__btn--primary"
                                onClick={handleApply}
                                disabled={!draftFrom}
                            >
                                Áp dụng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
