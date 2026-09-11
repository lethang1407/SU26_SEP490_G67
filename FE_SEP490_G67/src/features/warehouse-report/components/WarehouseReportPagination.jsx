export default function WarehouseReportPagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
}) {
  if (!totalItems || totalItems <= 0) return null;

  const currentPage = Math.max(1, (page ?? 0) + 1);
  const size = Math.max(1, pageSize || 15);
  const startIndex = (currentPage - 1) * size + 1;
  const endIndex = Math.min(currentPage * size, totalItems);
  const pagesCount = Math.max(1, totalPages || 1);

  const pages = [];
  for (let i = 1; i <= pagesCount; i += 1) {
    if (i === 1 || i === pagesCount || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="wr-pagination">
      <div className="wr-pagination__info">
        Hiển thị {startIndex}-{endIndex} / {totalItems} hàng hóa
      </div>
      <div className="wr-pagination__controls">
        <button
          type="button"
          className="wr-page-btn wr-page-btn--nav"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 2)}
        >
          &lt; Trước
        </button>
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`e-${idx}`} className="wr-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`wr-page-btn${p === currentPage ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => onPageChange?.(p - 1)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="wr-page-btn wr-page-btn--nav"
          disabled={disabled || currentPage >= pagesCount}
          onClick={() => onPageChange?.(currentPage)}
        >
          Sau &gt;
        </button>
      </div>
    </div>
  );
}
