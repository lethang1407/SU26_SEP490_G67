export default function CategoryPagination({
  page,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="cat-pagination">
      <div className="cat-pagination__info">
        Hiển thị {startIndex}–{endIndex} / <b>{totalItems}</b> danh mục
      </div>
      <div className="cat-pagination__controls">
        <button
          type="button"
          className="cat-page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          aria-label="Trang trước"
        >
          ‹
        </button>
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`e-${idx}`} className="cat-page-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`cat-page-btn${p === page ? ' is-active' : ''}`}
              onClick={() => onPageChange?.(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="cat-page-btn"
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
