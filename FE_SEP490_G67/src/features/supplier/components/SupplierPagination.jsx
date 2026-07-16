import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function SupplierPagination({
    page,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    onPageChange,
    itemLabel = 'nhà cung cấp',
}) {
    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <div className="supplier-pagination">
            <p className="supplier-pagination__info">
                Hiển thị {startIndex} - {endIndex} trong tổng số {totalItems} {itemLabel}
            </p>

            <div className="supplier-pagination__controls">
                <button
                    type="button"
                    className="supplier-pagination__nav"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Trang trước"
                >
                    <ChevronLeft size={18} />
                </button>

                {pageNumbers.map((item, index) =>
                    typeof item === 'string' ? (
                        <span key={`${item}-${index}`} className="supplier-pagination__ellipsis">
                            ...
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            className={`supplier-pagination__page ${
                                item === page ? 'supplier-pagination__page--active' : ''
                            }`}
                            onClick={() => onPageChange(item)}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="supplier-pagination__nav"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Trang sau"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
