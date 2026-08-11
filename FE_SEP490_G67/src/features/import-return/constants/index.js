export const IMPORT_RETURN_ROUTES = {
    page: '/admin/warehouse/return',
};

export const RETURN_METHOD = {
    RETURN: 'RETURN',
    EXCHANGE: 'EXCHANGE',
};

export const LINE_STATUS = {
    WAITING: 'WAITING_SUPPLIER',
    DONE: 'DONE',
};

export const DOC_STATUS = {
    DRAFT: 'DRAFT',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
};

export function formatReturnStatus(status) {
    switch (status) {
        case DOC_STATUS.DRAFT:
            return 'Nháp';
        case DOC_STATUS.IN_PROGRESS:
            return 'Đang đổi trả';
        case DOC_STATUS.COMPLETED:
            return 'Hoàn thành';
        default:
            return status || '—';
    }
}

export function getReturnStatusClass(status) {
    return status === DOC_STATUS.COMPLETED
        ? 'import-return-status import-return-status--success'
        : 'import-return-status import-return-status--danger';
}

export function formatLineStatus(status) {
    switch (status) {
        case LINE_STATUS.DONE:
            return 'Đã xong';
        case LINE_STATUS.WAITING:
            return 'Đang chờ nhà cung cấp';
        default:
            return status || '—';
    }
}

export function getLineStatusClass(status) {
    return status === LINE_STATUS.DONE
        ? 'import-return-status import-return-status--success'
        : 'import-return-status import-return-status--danger';
}

export function formatMethod(method) {
    return method === RETURN_METHOD.EXCHANGE ? 'Đổi' : 'Trả';
}

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${amount.toLocaleString('vi-VN')} đ`;
}

export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN');
}
