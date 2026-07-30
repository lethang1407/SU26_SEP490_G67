export const IMPORT_ORDER_ROUTES = {
    list: '/admin/warehouse/import',
    create: '/admin/warehouse/import/create',
    detail: (id) => `/admin/warehouse/import/${id}`,
};

/** Trạng thái thanh toán — khớp BE (derive từ nợ NCC) */
export const IMPORT_ORDER_STATUS = {
    DEBT: 'DEBT',
    DONE: 'DONE',
    RECEIVED: 'RECEIVED',
    DELIVERING: 'DELIVERING',
    CANCELLED: 'CANCELLED',
};

export const IMPORT_ORDER_STATUS_LABEL = {
    [IMPORT_ORDER_STATUS.DEBT]: 'Đang nợ',
    [IMPORT_ORDER_STATUS.DONE]: 'Hoàn thành',
    [IMPORT_ORDER_STATUS.RECEIVED]: 'Đã nhận',
    [IMPORT_ORDER_STATUS.DELIVERING]: 'Đang giao',
    [IMPORT_ORDER_STATUS.CANCELLED]: 'Đã hủy',
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

/** Trạng thái phiếu nhập (UI list mới) */
export const ORDER_STATUS = {
    DRAFT: 'DRAFT',
    IMPORTED: 'IMPORTED',
};

export const ORDER_STATUS_LABEL = {
    [ORDER_STATUS.DRAFT]: 'Phiếu tạm',
    [ORDER_STATUS.IMPORTED]: 'Đã nhập hàng',
};

export const ORDER_STATUS_FILTER = {
    ALL: 'ALL',
    DRAFT: ORDER_STATUS.DRAFT,
    IMPORTED: ORDER_STATUS.IMPORTED,
};

export const ORDER_STATUS_FILTER_LABEL = {
    [ORDER_STATUS_FILTER.ALL]: 'Tất cả',
    [ORDER_STATUS_FILTER.DRAFT]: 'Phiếu tạm',
    [ORDER_STATUS_FILTER.IMPORTED]: 'Đã nhập hàng',
};
