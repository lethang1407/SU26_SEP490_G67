export const ORDER_STATUS = {
    ALL: 'ALL',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'TRẢ HÀNG',
};

export const ORDER_STATUS_LABEL = {
    ALL: 'Tất cả',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    'TRẢ HÀNG': 'Đã đổi/trả',
    RETURNED: 'Đã đổi/trả',
    DEBT: 'Ghi nợ',
};

export const PAYMENT_METHOD = {
    ALL: 'ALL',
    CASH: 'CASH',
    TRANSFER: 'TRANSFER',
    DEBT: 'DEBT',
};

export const PAYMENT_METHOD_LABEL = {
    ALL: 'Tất cả',
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    DEBT: 'Ghi nợ',
};

export const DEBT_FILTER = {
    ALL: 'ALL',
    YES: 'true',
    NO: 'false',
};

export const DEBT_FILTER_LABEL = {
    ALL: 'Tất cả',
    YES: 'Ghi nợ',
    NO: 'Không nợ',
};

export const DATE_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'today', label: 'Hôm nay' },
    { key: '7days', label: '7 ngày' },
    { key: 'custom', label: 'Tùy chỉnh' },
];
