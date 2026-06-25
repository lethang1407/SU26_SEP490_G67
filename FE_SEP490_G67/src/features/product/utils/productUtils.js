import {
    CATEGORY_FILTER,
    STATUS_FILTER,
    SUPPLIER_FILTER,
} from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

export function filterProducts(products, { keyword, categoryFilter, statusFilter, supplierFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products.filter((product) => {
        const matchesKeyword =
            !normalizedKeyword ||
            product.name.toLowerCase().includes(normalizedKeyword) ||
            product.code.toLowerCase().includes(normalizedKeyword) ||
            product.barcode.includes(normalizedKeyword);

        const matchesCategory =
            categoryFilter === CATEGORY_FILTER.ALL || product.category === categoryFilter;

        const productStatus =
            product.stock > 0 ? STATUS_FILTER.IN_STOCK : STATUS_FILTER.OUT_OF_STOCK;
        const matchesStatus =
            statusFilter === STATUS_FILTER.ALL || productStatus === statusFilter;

        const matchesSupplier =
            supplierFilter === SUPPLIER_FILTER.ALL || product.supplier === supplierFilter;

        return matchesKeyword && matchesCategory && matchesStatus && matchesSupplier;
    });
}

export function paginateItems(items, page, pageSize) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
        items: items.slice(startIndex, endIndex),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        startIndex: totalItems === 0 ? 0 : startIndex + 1,
        endIndex,
    };
}
