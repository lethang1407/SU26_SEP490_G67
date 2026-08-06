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

export default function ImportOrderPagination({
    page,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    onPageChange,
}) {
    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <div className="import-order-pagination">
            <p className="import-order-pagination__info">
                Hiển thị {startIndex} đến {endIndex} trong số {totalItems} kết quả
            </p>

            <div className="import-order-pagination__controls">
                <button
                    type="button"
                    className="import-order-pagination__nav"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    ‹
                </button>

                {pageNumbers.map((item, index) =>
                    typeof item === 'string' ? (
                        <span key={`${item}-${index}`} className="import-order-pagination__ellipsis">
                            ...
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            className={`import-order-pagination__page ${
                                item === page ? 'import-order-pagination__page--active' : ''
                            }`}
                            onClick={() => onPageChange(item)}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="import-order-pagination__nav"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    ›
                </button>
            </div>
        </div>
    );
}
