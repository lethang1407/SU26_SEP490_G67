import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/** Dải số trang quanh trang hiện tại, luôn giữ trang đầu và trang cuối. */
function buildPages(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

export default function RevenuePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  disabled = false,
  unitLabel = 'giao dịch',
}) {
  if (!totalItems) return null;

  const pagesCount = Math.max(1, totalPages || 1);
  const current = Math.min(Math.max(1, (page ?? 0) + 1), pagesCount);
  const size = Math.max(1, pageSize || 10);
  const start = (current - 1) * size + 1;
  const end = Math.min(current * size, totalItems);

  const go = (target) => {
    if (disabled) return;
    const next = Math.min(Math.max(1, target), pagesCount);
    if (next !== current) onPageChange?.(next - 1);
  };

  return (
    <div className="rr-pagination">
      <span className="rr-pagination_info">
        Bảng hiển thị {start} - {end} trong tổng số {totalItems.toLocaleString('vi-VN')} {unitLabel}
      </span>
      <div className="rr-pagination_controls">
        <button
          type="button"
          className="rr-page-btn"
          disabled={disabled || current <= 1}
          onClick={() => go(1)}
          aria-label="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          className="rr-page-btn"
          disabled={disabled || current <= 1}
          onClick={() => go(current - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>
        {buildPages(current, pagesCount).map((p, index) =>
          p === '…' ? (
            <span key={`gap-${index}`} className="rr-page-gap">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`rr-page-btn${p === current ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => go(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="rr-page-btn"
          disabled={disabled || current >= pagesCount}
          onClick={() => go(current + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          className="rr-page-btn"
          disabled={disabled || current >= pagesCount}
          onClick={() => go(pagesCount)}
          aria-label="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
