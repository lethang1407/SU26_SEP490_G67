import { useState } from 'react';
import { ChevronDown, Download, Package, RefreshCw } from 'lucide-react';
import ReportDateRangePicker from './ReportDateRangePicker';
import ProductMultiSelectModal from './ProductMultiSelectModal';
import { MOVEMENT_TYPE_OPTIONS } from '../api';

export default function WarehouseReportFilters({
  fromDate,
  toDate,
  onDateChange,
  selectedProducts,
  onProductsChange,
  typeFilter,
  onTypeChange,
  onRefresh,
  onExport,
  loading,
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
        <div className="wr-filters__field wr-filters__field--grow">
          <label>Thời gian</label>
          <ReportDateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onApply={onDateChange}
          />
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

        <div className="wr-filters__actions">
          <button
            type="button"
            className="wr-btn wr-btn--primary"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'wr-spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            className="wr-btn wr-btn--secondary"
            onClick={onExport}
            disabled={loading}
          >
            <Download size={16} />
            Excel
          </button>
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
