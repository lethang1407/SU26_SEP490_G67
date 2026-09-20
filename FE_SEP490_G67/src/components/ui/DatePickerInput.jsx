import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../css/DatePicker.css';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function toIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseIso(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(left, right) {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function formatDisplay(value) {
    const date = parseIso(value);
    if (!date) return '';
    return date.toLocaleDateString('vi-VN');
}

function monthTitle(date) {
    return `Tháng ${date.getMonth() + 1} ${date.getFullYear()}`;
}

function isoInRange(iso, min, max) {
    if (min && iso < min) return false;
    if (max && iso > max) return false;
    return true;
}

function buildGrid(monthDate) {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
}

export default function DatePickerInput({
    value = '',
    onChange,
    className = '',
    title,
    ariaLabel,
    dialogLabel = 'Chọn ngày',
    placeholder = 'dd/mm/yyyy',
    min,
    max,
}) {
    const triggerRef = useRef(null);
    const popupRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => parseIso(value) || new Date());
    const [popupStyle, setPopupStyle] = useState({});

    const selected = parseIso(value);
    const today = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }, [open]);
    const days = useMemo(() => buildGrid(viewMonth), [viewMonth]);
    const display = formatDisplay(value);
    const todayIso = toIso(today);
    const todayAllowed = isoInRange(todayIso, min, max);

    const placePopup = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const width = 268;
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
        const below = rect.bottom + 6;
        const estimatedHeight = 320;
        const top =
            below + estimatedHeight > window.innerHeight - 8
                ? Math.max(8, rect.top - estimatedHeight - 6)
                : below;
        setPopupStyle({ top, left, width });
    };

    useEffect(() => {
        if (!open) return undefined;
        setViewMonth(parseIso(value) || new Date());
        placePopup();

        const handlePointer = (event) => {
            if (triggerRef.current?.contains(event.target)) return;
            if (popupRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        const handleReposition = () => placePopup();
        document.addEventListener('mousedown', handlePointer);
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [open, value]);

    const commit = (nextValue) => {
        onChange?.(nextValue);
        setOpen(false);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={`vi-datepicker__trigger ${className}`.trim()}
                title={title}
                aria-label={ariaLabel}
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className={display ? undefined : 'vi-datepicker__placeholder'}>
                    {display || placeholder}
                </span>
                <CalendarDays size={15} />
            </button>
            {open
                ? createPortal(
                      <div
                          ref={popupRef}
                          className="vi-datepicker__popup"
                          style={popupStyle}
                          role="dialog"
                          aria-label={dialogLabel}
                      >
                          <div className="vi-datepicker__nav">
                              <button
                                  type="button"
                                  className="vi-datepicker__nav-btn"
                                  onClick={() =>
                                      setViewMonth(
                                          (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                                      )
                                  }
                                  aria-label="Tháng trước"
                              >
                                  <ChevronLeft size={16} />
                              </button>
                              <strong className="vi-datepicker__month">{monthTitle(viewMonth)}</strong>
                              <button
                                  type="button"
                                  className="vi-datepicker__nav-btn"
                                  onClick={() =>
                                      setViewMonth(
                                          (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                                      )
                                  }
                                  aria-label="Tháng sau"
                              >
                                  <ChevronRight size={16} />
                              </button>
                          </div>
                          <div className="vi-datepicker__weekdays">
                              {WEEKDAYS.map((label) => (
                                  <span key={label}>{label}</span>
                              ))}
                          </div>
                          <div className="vi-datepicker__days">
                              {days.map((day) => {
                                  const inMonth = day.getMonth() === viewMonth.getMonth();
                                  const iso = toIso(day);
                                  const isSelected = selected ? sameDay(day, selected) : false;
                                  const isToday = sameDay(day, today);
                                  const disabled = !isoInRange(iso, min, max);
                                  return (
                                      <button
                                          key={iso}
                                          type="button"
                                          disabled={disabled}
                                          className={[
                                              'vi-datepicker__day',
                                              inMonth ? '' : 'vi-datepicker__day--muted',
                                              isSelected ? 'vi-datepicker__day--selected' : '',
                                              isToday ? 'vi-datepicker__day--today' : '',
                                              disabled ? 'vi-datepicker__day--disabled' : '',
                                          ]
                                              .filter(Boolean)
                                              .join(' ')}
                                          onClick={() => commit(iso)}
                                      >
                                          {day.getDate()}
                                      </button>
                                  );
                              })}
                          </div>
                          <div className="vi-datepicker__footer">
                              <button
                                  type="button"
                                  className="vi-datepicker__link"
                                  onClick={() => commit('')}
                              >
                                  Xóa
                              </button>
                              <button
                                  type="button"
                                  className="vi-datepicker__link"
                                  disabled={!todayAllowed}
                                  onClick={() => commit(todayIso)}
                              >
                                  Hôm nay
                              </button>
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
