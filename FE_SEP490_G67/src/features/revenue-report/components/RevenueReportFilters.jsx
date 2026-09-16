import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Search } from 'lucide-react';
import { PAYMENT_METHOD_OPTIONS } from '../api';
import { QUARTER_OPTIONS, buildYearOptions } from '../utils/revenueReportUtils';

const YEAR_OPTIONS = buildYearOptions();

/**
 * Chọn năm dạng danh sách cuộn. Mở ra là cuộn sẵn tới năm đang chọn (mặc định năm hiện tại),
 * đóng khi chọn, bấm ra ngoài hoặc nhấn Esc.
 */
function YearPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    selectedRef.current?.scrollIntoView({ block: 'center' });

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="rr-year" ref={rootRef}>
      <button
        id="rr-year"
        type="button"
        className="rr-input rr-year_trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{value}</span>
        <ChevronDown size={15} className={open ? 'rr-year_chevron is-open' : 'rr-year_chevron'} />
      </button>

      {open && (
        <ul className="rr-year_list" role="listbox" aria-labelledby="rr-year">
          {YEAR_OPTIONS.map((opt) => {
            const selected = opt.value === String(value);
            return (
              <li
                key={opt.value}
                ref={selected ? selectedRef : undefined}
                role="option"
                aria-selected={selected}
                className={selected ? 'rr-year_option is-selected' : 'rr-year_option'}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function RevenueReportFilters({
  filters,
  staffOptions,
  onChange,
  onApply,
  loading,
}) {
  const handle = (key) => (event) => onChange?.(key, event.target.value);

  const owners = staffOptions.filter((opt) => opt.owner);
  const staff = staffOptions.filter((opt) => !opt.owner);

  return (
    <form
      className="rr-filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply?.();
      }}
    >
      <div className="rr-filters_field rr-filters_field--year">
        <label htmlFor="rr-year">Năm</label>
        <YearPicker value={filters.year} onChange={(year) => onChange?.('year', year)} />
      </div>

      <div className="rr-filters_field rr-filters_field--quarter">
        <label htmlFor="rr-quarter">Quý</label>
        <select
          id="rr-quarter"
          className="rr-input"
          value={filters.quarter}
          onChange={handle('quarter')}
        >
          {QUARTER_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rr-filters_field">
        <label htmlFor="rr-from">Từ ngày</label>
        <div className="rr-input-wrap">
          <Calendar size={15} className="rr-input-wrap_icon" />
          <input
            id="rr-from"
            type="date"
            className="rr-input rr-input--with-icon"
            value={filters.from}
            max={filters.to || undefined}
            onChange={handle('from')}
          />
        </div>
      </div>

      <div className="rr-filters_field">
        <label htmlFor="rr-to">Đến ngày</label>
        <div className="rr-input-wrap">
          <Calendar size={15} className="rr-input-wrap_icon" />
          <input
            id="rr-to"
            type="date"
            className="rr-input rr-input--with-icon"
            value={filters.to}
            min={filters.from || undefined}
            onChange={handle('to')}
          />
        </div>
      </div>

      <div className="rr-filters_field">
        <label htmlFor="rr-payment">Phương thức thanh toán</label>
        <select
          id="rr-payment"
          className="rr-input"
          value={filters.paymentMethod}
          onChange={handle('paymentMethod')}
        >
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rr-filters_field rr-filters_field--staff">
        <label htmlFor="rr-staff">Nhân viên bán hàng</label>
        <select
          id="rr-staff"
          className="rr-input"
          value={filters.staffId}
          onChange={handle('staffId')}
        >
          <option value="">Tất cả nhân viên</option>
          {owners.length > 0 && (
            <optgroup label="Chủ cửa hàng">
              {owners.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          )}
          {staff.length > 0 && (
            <optgroup label="Nhân viên">
              {staff.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <button
        type="submit"
        className="rr-filters_submit"
        disabled={loading}
        aria-label="Xem báo cáo"
        title="Xem báo cáo"
      >
        <Search size={17} />
      </button>
    </form>
  );
}
