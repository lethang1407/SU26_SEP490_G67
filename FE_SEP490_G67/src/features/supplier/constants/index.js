export const IMPORT_ORDER_STATUS = {
    DEBT: 'DEBT',
    PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
    DONE: 'DONE',
};

export const IMPORT_ORDER_STATUS_LABEL = {
    DEBT: 'Đang nợ',
    PENDING_SETTLEMENT: 'Chờ quyết toán',
    DONE: 'Hoàn thành',
};

export const IMPORT_HISTORY_FILTER = {
    ALL: 'ALL',
    DEBT: 'DEBT',
    PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',
    DONE: 'DONE',
};

export const IMPORT_HISTORY_FILTER_LABEL = {
    [IMPORT_HISTORY_FILTER.ALL]: 'Tất cả',
    [IMPORT_HISTORY_FILTER.DEBT]: 'Đang nợ',
    [IMPORT_HISTORY_FILTER.PENDING_SETTLEMENT]: 'Chờ quyết toán',
    [IMPORT_HISTORY_FILTER.DONE]: 'Hoàn thành',
};

export const PAYMENT_METHOD_LABEL = {
    CASH: 'Tiền mặt',
    QR: 'Chuyển khoản',
};
