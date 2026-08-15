export default function ImportHistoryPagination({
  page,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}) {
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="ih-pagination">
      <div className="ih-pagination__info">
        Hiển thị {startIndex} đến {endIndex} của {totalItems} bản ghi
      </div>
      <div className="ih-pagination__controls">
        <button
          type="button"
          className="ih-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          aria-label="Trang trước"
        >
          ‹
        </button>
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`e-${idx}`} className="ih-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`ih-page-btn${p === page ? ' is-active' : ''}`}
              onClick={() => onPageChange?.(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="ih-page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          aria-label="Trang sau"
        >
          ›
        </button>
      </div>
    </div>
  );
}
