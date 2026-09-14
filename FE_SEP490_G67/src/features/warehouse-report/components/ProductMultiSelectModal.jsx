import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Package, Search, X } from 'lucide-react';
import { warehouseReportApi } from '../api';
import { formatQty, formatShortPrice } from '../utils/warehouseReportUtils';

function getBaseUnit(product) {
  if (product?.unitName) return product.unitName;
  const units = product?.productUnits || [];
  const base = units.find((u) => Number(u.unitBase) === 1);
  return base?.name || units[0]?.name || 'sp';
}

export default function ProductMultiSelectModal({
  open,
  selected = [],
  onClose,
  onConfirm,
}) {
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);
  const wasOpenRef = useRef(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(() => new Map());
  const [focusIndex, setFocusIndex] = useState(0);

  // Chỉ reset khi modal vừa mở (tránh nháy do re-render / đổi reference `selected`)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const map = new Map();
      selected.forEach((p) => map.set(p.id, p));
      setDraft(map);
      setQuery('');
      setFocusIndex(0);
      setError('');
      setLoading(true);
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
      wasOpenRef.current = true;
      return () => clearTimeout(t);
    }
    if (!open) {
      wasOpenRef.current = false;
    }
    return undefined;
  }, [open, selected]);

  useEffect(() => {
    if (!open) return undefined;

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    const timer = setTimeout(async () => {
      try {
        const rows = await warehouseReportApi.searchProducts(query);
        if (currentRequestId !== requestIdRef.current) return;
        setResults(Array.isArray(rows) ? rows : []);
        setFocusIndex(0);
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setResults([]);
        setError('Không thể tải hàng hóa. Vui lòng thử lại.');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, query.trim() ? 250 : 0);

    return () => {
      clearTimeout(timer);
      // Không cancel bằng cờ boolean cũ — dùng requestId để tránh race
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const selectedCount = draft.size;

  const toggleProduct = (product) => {
    setDraft((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else {
        next.set(product.id, {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          sellingPrice: product.sellingPrice,
          stockQuantity: product.stockQuantity,
          unitName: getBaseUnit(product),
        });
      }
      return next;
    });
  };

  const handleKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[focusIndex];
      if (item) toggleProduct(item);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="wr-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="wr-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn nhiều hàng hóa"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="wr-modal__header">
          <h3>Chọn nhiều hàng hóa</h3>
          <button type="button" className="wr-modal__close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="wr-modal__search">
          <Search size={16} className="wr-modal__search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm... (↑↓ di chuyển · Enter chọn)"
          />
        </div>

        <div className="wr-modal__meta">
          {loading ? 'Đang tải...' : error || `${results.length} hàng hóa`}
        </div>

        <div className="wr-modal__table-wrap">
          <table className="wr-modal__table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Mã HH</th>
                <th>Tên hàng hóa</th>
                <th>ĐVT</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {results.map((product, index) => {
                const checked = draft.has(product.id);
                const outOfStock = Number(product.stockQuantity || 0) <= 0;
                return (
                  <tr
                    key={product.id}
                    className={[
                      checked ? 'is-checked' : '',
                      index === focusIndex ? 'is-focused' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => toggleProduct(product)}
                    onMouseEnter={() => setFocusIndex(index)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(product)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>{product.sku || product.barcode || '—'}</td>
                    <td>{product.name}</td>
                    <td>{getBaseUnit(product)}</td>
                    <td>{formatShortPrice(product.sellingPrice)}</td>
                    <td>
                      {outOfStock ? (
                        <span className="wr-stock wr-stock--out">
                          <AlertTriangle size={14} /> Hết hàng
                        </span>
                      ) : (
                        <span className="wr-stock wr-stock--ok">
                          <Package size={14} /> {formatQty(product.stockQuantity)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="wr-modal__empty">
                    {error || 'Không tìm thấy hàng hóa'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="wr-modal__footer">
          <button
            type="button"
            className="wr-link-btn"
            onClick={() => setDraft(new Map())}
            disabled={selectedCount === 0}
          >
            Bỏ chọn tất cả
          </button>
          <button
            type="button"
            className="wr-btn wr-btn--primary"
            onClick={() => onConfirm?.(Array.from(draft.values()))}
          >
            Xong ({selectedCount})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
