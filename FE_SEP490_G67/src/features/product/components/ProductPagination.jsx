function buildPageNumbers(currentPage, totalPages) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];

    if (currentPage > 3) {
        pages.push('ellipsis-start');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
    }

    if (totalPages > 1) {
        pages.push(totalPages);
    }

    return pages;
}

export default function ProductPagination({
    page,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    onPageChange,
}) {
    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <div className="product-pagination">
            <p className="product-pagination__info">
                Hiển thị {startIndex} - {endIndex} trong số {totalItems} sản phẩm
            </p>

            <div className="product-pagination__controls">
                <button
                    type="button"
                    className="product-pagination__nav"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Trang trước"
                >
                    Trước
                </button>

                {pageNumbers.map((item, index) =>
                    typeof item === 'string' ? (
                        <span key={`${item}-${index}`} className="product-pagination__ellipsis">
                            ...
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            className={`product-pagination__page ${
                                item === page ? 'product-pagination__page--active' : ''
                            }`}
                            onClick={() => onPageChange(item)}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="product-pagination__nav"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Trang sau"
                >
                    Sau
                </button>
            </div>
        </div>
    );
}
