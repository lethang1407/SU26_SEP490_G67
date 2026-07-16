import { ORDER_STATUS_FILTER } from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function filterImportOrders(orders, { keyword, orderStatusFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return orders.filter((order) => {
        const matchesKeyword =
            !normalizedKeyword ||
            order.orderCode.toLowerCase().includes(normalizedKeyword) ||
            order.supplierCode.toLowerCase().includes(normalizedKeyword) ||
            order.supplierName.toLowerCase().includes(normalizedKeyword);

        const matchesStatus =
            orderStatusFilter === ORDER_STATUS_FILTER.ALL || order.orderStatus === orderStatusFilter;

        return matchesKeyword && matchesStatus;
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
