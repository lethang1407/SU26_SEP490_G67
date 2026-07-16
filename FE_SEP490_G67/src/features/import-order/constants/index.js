export const IMPORT_ORDER_ROUTES = {
    list: '/admin/warehouse/import',
    create: '/admin/warehouse/import/create',
    detail: (id) => `/admin/warehouse/import/${id}`,
};

/** Trạng thái thanh toán — khớp BE (derive từ nợ NCC) */
export const IMPORT_ORDER_STATUS = {
    DEBT: 'DEBT',
    DONE: 'DONE',
};

export const IMPORT_ORDER_STATUS_LABEL = {
    [IMPORT_ORDER_STATUS.DEBT]: 'Đang nợ',
    [IMPORT_ORDER_STATUS.DONE]: 'Hoàn thành',
};

export const IMPORT_ORDER_STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: IMPORT_ORDER_STATUS.DEBT, label: IMPORT_ORDER_STATUS_LABEL.DEBT },
    { value: IMPORT_ORDER_STATUS.DONE, label: IMPORT_ORDER_STATUS_LABEL.DONE },
];

export const DATE_FILTER_OPTIONS = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'all', label: 'Tất cả' },
];
