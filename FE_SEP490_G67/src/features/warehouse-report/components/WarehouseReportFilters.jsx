import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Package } from 'lucide-react';
import ProductMultiSelectModal from './ProductMultiSelectModal';
import { MOVEMENT_TYPE_OPTIONS } from '../api';
import { buildYearOptions } from '../utils/warehouseReportUtils';

const YEAR_OPTIONS = buildYearOptions();

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
    <div className="wr-year" ref={rootRef}>
      <button
        id="wr-year"
        type="button"
        className="wr-filters__select wr-year__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{value}</span>
        <ChevronDown size={15} className={open ? 'wr-year__chevron is-open' : 'wr-year__chevron'} />
      </button>

      {open && (
        <ul className="wr-year__list" role="listbox" aria-labelledby="wr-year">
          {YEAR_OPTIONS.map((opt) => {
            const selected = opt.value === String(value);
            return (
              <li
                key={opt.value}
                ref={selected ? selectedRef : undefined}
                role="option"
                aria-selected={selected}
                className={selected ? 'wr-year__option is-selected' : 'wr-year__option'}
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

export default function WarehouseReportFilters({
  year,
  fromDate,
  toDate,
  onYearChange,
  onFromChange,
  onToChange,
  selectedProducts,
  onProductsChange,
  typeFilter,
  onTypeChange,
}) {
  const [productModalOpen, setProductModalOpen] = useState(false);

  const productLabel =
    selectedProducts.length === 0
      ? 'Tất cả hàng hóa'
      : selectedProducts.length === 1
        ? selectedProducts[0].name
        : `${selectedProducts.length} hàng hóa`;

  return (
    <>
      <div className="wr-filters">
        <div className="wr-filters__field wr-filters__field--year">
          <label htmlFor="wr-year">Năm</label>
          <YearPicker value={year} onChange={onYearChange} />
        </div>

        <div className="wr-filters__field wr-filters__field--date">
          <label htmlFor="wr-from">Từ ngày</label>
          <div className="wr-input-wrap">
            <Calendar size={15} className="wr-input-wrap__icon" />
            <input
              id="wr-from"
              type="date"
              className="wr-filters__select wr-filters__select--with-icon"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => onFromChange?.(e.target.value)}
            />
          </div>
        </div>

        <div className="wr-filters__field wr-filters__field--date">
          <label htmlFor="wr-to">Đến ngày</label>
          <div className="wr-input-wrap">
            <Calendar size={15} className="wr-input-wrap__icon" />
            <input
              id="wr-to"
              type="date"
              className="wr-filters__select wr-filters__select--with-icon"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => onToChange?.(e.target.value)}
            />
          </div>
        </div>

        <div className="wr-filters__field wr-filters__field--grow">
          <label>Hàng hóa</label>
          <button
            type="button"
            className={`wr-filters__select-btn ${selectedProducts.length ? 'is-active' : ''}`}
            onClick={() => setProductModalOpen(true)}
          >
            <Package size={16} />
            <span>{productLabel}</span>
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="wr-filters__field wr-filters__field--type">
          <label>Loại phát sinh</label>
          <select
            className="wr-filters__select"
            value={typeFilter}
            onChange={(e) => onTypeChange?.(e.target.value)}
          >
            {MOVEMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ProductMultiSelectModal
        open={productModalOpen}
        selected={selectedProducts}
        onClose={() => setProductModalOpen(false)}
        onConfirm={(items) => {
          onProductsChange?.(items);
          setProductModalOpen(false);
        }}
      />
    </>
  );
}
