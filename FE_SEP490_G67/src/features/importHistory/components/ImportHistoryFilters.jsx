import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Download, Search } from 'lucide-react';
import { DATE_RANGE_PRESETS } from '../constants';
import { searchProducts } from '../utils/importHistoryUtils';

export default function ImportHistoryFilters({
  dateRange,
  onDateRangeChange,
  supplierKeyword,
  onSupplierKeywordChange,
  productKeyword,
  onProductKeywordChange,
  productCatalog,
  focusedProduct,
  onSelectProduct,
  onExport,
}) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const wrapRef = useRef(null);

  const suggestions = searchProducts(productCatalog, productKeyword).slice(0, 6);
  const showSuggestions =
    suggestionsOpen && !focusedProduct && productKeyword.trim() && suggestions.length > 0;

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleProductKeyDown = (e) => {
    if (e.key === 'Enter' && suggestions.length >= 1) {
      e.preventDefault();
      onSelectProduct?.(suggestions[0]);
      setSuggestionsOpen(false);
    }
    if (e.key === 'Escape') {
      setSuggestionsOpen(false);
    }
  };

  return (
    <div className="ih-filters">
      <label className="ih-filters__date">
        <CalendarDays size={16} />
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange?.(e.target.value)}
          aria-label="Khoảng thời gian"
        >
          {DATE_RANGE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="ih-filters__search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Tìm theo nhà cung cấp hoặc mã nhập đơn"
          value={supplierKeyword}
          onChange={(e) => onSupplierKeywordChange?.(e.target.value)}
        />
      </div>

      <div className="ih-filters__search ih-filters__search--product" ref={wrapRef}>
        <Search size={16} />
        <input
          type="search"
          placeholder="Tìm theo sản phẩm..."
          value={focusedProduct ? focusedProduct.productName : productKeyword}
          onChange={(e) => {
            onProductKeywordChange?.(e.target.value);
            setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onKeyDown={handleProductKeyDown}
          readOnly={Boolean(focusedProduct)}
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
        {showSuggestions ? (
          <ul className="ih-suggest" role="listbox">
            {suggestions.map((p) => (
              <li key={p.productId}>
                <button
                  type="button"
                  className="ih-suggest__item"
                  onClick={() => {
                    onSelectProduct?.(p);
                    setSuggestionsOpen(false);
                  }}
                >
                  <span className="ih-suggest__name">{p.productName}</span>
                  <span className="ih-suggest__sku">{p.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button type="button" className="ih-btn ih-btn--outline" onClick={onExport}>
        <Download size={16} />
        Xuất Excel
      </button>
    </div>
  );
}
