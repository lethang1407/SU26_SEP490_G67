export function formatCustomerLabel(order) {
    const name = order?.customerName?.trim();
    const phone = order?.customerPhone?.trim();
    if (!name && !phone) return 'Khách lẻ';
    if (!phone) return name;
    if (!name) return phone;
    return `${name} - ${phone}`;
}

export function formatCustomerName(order) {
    return order?.customerName?.trim() || 'Khách lẻ';
}

const PAYMENT_METHOD_META = {
    CASH: { label: 'Tiền mặt', tone: 'cash' },
    TRANSFER: { label: 'Chuyển khoản', tone: 'transfer' },
    BANK: { label: 'Chuyển khoản', tone: 'transfer' },
    BANK_TRANSFER: { label: 'Chuyển khoản', tone: 'transfer' },
    DEBT: { label: 'Ghi nợ', tone: 'debt' },
};

/**
 * @returns {{label: string, tone: string}} nhãn để hiện và tone để tô màu badge
 */
export function formatPaymentMethod(paymentMethod) {
    if (!paymentMethod) return { label: 'N/A', tone: 'unknown' };

    return PAYMENT_METHOD_META[String(paymentMethod).toUpperCase()]
        ?? { label: paymentMethod, tone: 'unknown' };
}

export function formatVnDateTime(isoString) {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
