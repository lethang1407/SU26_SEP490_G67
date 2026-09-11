import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  detectPreset,
  formatVnDate,
  parseIso,
  resolvePresetRange,
  toIsoDate,
} from '../utils/warehouseReportUtils';

const WEEKDAYS = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];

const PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last-7', label: '7 ngày qua' },
  { key: 'last-30', label: '30 ngày qua' },
  { key: 'this-week', label: 'Tuần này' },
  { key: 'this-month', label: 'Tháng này' },
  { key: 'this-quarter', label: 'Quý này' },
  { key: 'this-year', label: 'Năm này' },
  { key: 'all', label: 'Tất cả' },
];

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

function MonthCalendar({ monthDate, fromDate, toDate, onSelectDay, onPrev, onNext, showPrev, showNext }) {
  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const title = `Tháng ${monthDate.getMonth() + 1} ${monthDate.getFullYear()}`;

  return (
    <div className="wr-daterange__month">
      <div className="wr-daterange__month-nav">
        {showPrev ? (
          <button type="button" className="wr-daterange__nav-btn" onClick={onPrev} aria-label="Tháng trước">
            <ChevronLeft size={18} />
          </button>
        ) : (
          <span className="wr-daterange__nav-spacer" />
        )}
        <span className="wr-daterange__month-title">{title}</span>
        {showNext ? (
          <button type="button" className="wr-daterange__nav-btn" onClick={onNext} aria-label="Tháng sau">
            <ChevronRight size={18} />
          </button>
        ) : (
          <span className="wr-daterange__nav-spacer" />
        )}
      </div>
      <div className="wr-daterange__weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="wr-daterange__days">
        {cells.map(({ date, inMonth }) => {
          const isFrom = sameDay(date, fromDate);
          const isTo = sameDay(date, toDate);
          const inRange = isBetween(date, fromDate, toDate);
          const className = [
            'wr-daterange__day',
            !inMonth ? 'wr-daterange__day--muted' : '',
            isFrom || isTo ? 'wr-daterange__day--selected' : '',
            inRange ? 'wr-daterange__day--in-range' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${toIsoDate(date)}-${inMonth ? 'i' : 'o'}`}
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

export default function ReportDateRangePicker({ fromDate = '', toDate = '', onApply }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(null);
  const [draftTo, setDraftTo] = useState(null);
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(new Date()));
  const [activePreset, setActivePreset] = useState(() => detectPreset(fromDate, toDate));

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  const appliedLabel = useMemo(() => {
    const preset = detectPreset(fromDate, toDate);
    if (preset === 'all') return 'Tất cả thời gian';
    const found = PRESETS.find((p) => p.key === preset);
    if (found && preset !== 'custom') return found.label;
    const from = parseIso(fromDate);
    const to = parseIso(toDate);
    if (from && to && sameDay(from, to)) return formatVnDate(from);
    return `${from ? formatVnDate(from) : '…'} – ${to ? formatVnDate(to) : '…'}`;
  }, [fromDate, toDate]);

  const openPopup = () => {
    const from = parseIso(fromDate);
    const to = parseIso(toDate);
    setDraftFrom(from);
    setDraftTo(to);
    setLeftMonth(startOfMonth(from || to || new Date()));
    setActivePreset(detectPreset(fromDate, toDate));
    setOpen(true);
  };

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
    setActivePreset('custom');
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

  const applyRange = (from, to, presetKey) => {
    onApply?.({
      fromDate: from || '',
      toDate: to || '',
      preset: presetKey,
    });
    setOpen(false);
  };

  const handlePreset = (key) => {
    setActivePreset(key);
    const range = resolvePresetRange(key);
    if (key === 'all') {
      setDraftFrom(null);
      setDraftTo(null);
      applyRange(null, null, key);
      return;
    }
    const from = parseIso(range.from);
    const to = parseIso(range.to);
    setDraftFrom(from);
    setDraftTo(to);
    if (from) setLeftMonth(startOfMonth(from));
    applyRange(range.from, range.to, key);
  };

  const handleApply = () => {
    if (activePreset === 'all' && !draftFrom) {
      applyRange(null, null, 'all');
      return;
    }
    const from = draftFrom;
    const to = draftTo || draftFrom;
    if (!from) return;
    applyRange(toIsoDate(from), toIsoDate(to), 'custom');
  };

  return (
    <div className="wr-daterange" ref={rootRef}>
      <button
        type="button"
        className={`wr-daterange__trigger ${fromDate || toDate || activePreset === 'all' ? 'wr-daterange__trigger--active' : ''}`}
        onClick={() => (open ? setOpen(false) : openPopup())}
        aria-expanded={open}
      >
        <CalendarDays size={16} />
        <span>{appliedLabel}</span>
      </button>

      {(fromDate || toDate) && (
        <button
          type="button"
          className="wr-daterange__clear"
          onClick={() => applyRange(null, null, 'all')}
          title="Xóa lọc ngày"
          aria-label="Xóa lọc ngày"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="wr-daterange__popup" role="dialog" aria-label="Lọc theo khoảng thời gian">
          <aside className="wr-daterange__sidebar">
            <div className="wr-daterange__sidebar-title">Lọc nhanh</div>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`wr-daterange__preset-item ${activePreset === preset.key ? 'is-active' : ''}`}
                onClick={() => handlePreset(preset.key)}
              >
                <span>{preset.label}</span>
                {activePreset === preset.key && <Check size={16} />}
              </button>
            ))}
          </aside>

          <div className="wr-daterange__main">
            <div className="wr-daterange__calendars">
              <MonthCalendar
                monthDate={leftMonth}
                fromDate={draftFrom}
                toDate={draftTo || draftFrom}
                onSelectDay={handleSelectDay}
                onPrev={() => setLeftMonth((prev) => addMonths(prev, -1))}
                onNext={() => setLeftMonth((prev) => addMonths(prev, 1))}
                showPrev
                showNext={false}
              />
              <MonthCalendar
                monthDate={rightMonth}
                fromDate={draftFrom}
                toDate={draftTo || draftFrom}
                onSelectDay={handleSelectDay}
                onPrev={() => setLeftMonth((prev) => addMonths(prev, -1))}
                onNext={() => setLeftMonth((prev) => addMonths(prev, 1))}
                showPrev={false}
                showNext
              />
            </div>
            <div className="wr-daterange__footer">
              <div className="wr-daterange__footer-label">
                {draftFrom || draftTo
                  ? `${formatVnDate(draftFrom)} – ${formatVnDate(draftTo || draftFrom)}`
                  : 'Chọn khoảng ngày trên lịch'}
              </div>
              <button
                type="button"
                className="wr-btn wr-btn--primary"
                onClick={handleApply}
                disabled={!draftFrom && activePreset !== 'all'}
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
