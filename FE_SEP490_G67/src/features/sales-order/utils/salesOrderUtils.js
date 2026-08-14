import {
    ORDER_STATUS_LABEL,
    PAYMENT_METHOD_LABEL,
} from '../constants';

export function formatCurrency(value) {
    if (value == null || Number.isNaN(Number(value))) return '0đ';
    return `${Number(value).toLocaleString('vi-VN')}đ`;
}

export function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function getStatusLabel(status) {
    if (!status) return '—';
    return ORDER_STATUS_LABEL[status] || status;
}

export function getStatusClass(status) {
    const key = String(status || '').toUpperCase();
    if (key === 'COMPLETED') return 'sales-order-status--completed';
    if (key === 'CANCELLED') return 'sales-order-status--cancelled';
    if (key === 'TRẢ HÀNG' || key === 'RETURNED' || status === 'TRẢ HÀNG') {
        return 'sales-order-status--returned';
    }
    return 'sales-order-status--default';
}

export function getPaymentLabel(method) {
    if (!method) return '—';
    return PAYMENT_METHOD_LABEL[method] || method;
}

/** Local YYYY-MM-DD for date inputs / API dateFrom dateTo */
export function toLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function resolveDateRange(dateFilter, customFrom, customTo) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
        const s = toLocalDateString(today);
        return { dateFrom: s, dateTo: s };
    }
    if (dateFilter === '7days') {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { dateFrom: toLocalDateString(from), dateTo: toLocalDateString(today) };
    }
    if (dateFilter === 'custom') {
        return {
            dateFrom: customFrom || undefined,
            dateTo: customTo || undefined,
        };
    }
    return { dateFrom: undefined, dateTo: undefined };
}
