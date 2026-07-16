export const INVENTORY_CHECK_ROUTES = {
    list: '/admin/warehouse/check',
    create: '/admin/warehouse/check/create',
    detail: (id) => `/admin/warehouse/check/${id}`,
};

export const CHECK_STATUS = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const CHECK_STATUS_LABEL = {
    [CHECK_STATUS.IN_PROGRESS]: 'Đang kiểm',
    [CHECK_STATUS.COMPLETED]: 'Đã kiểm xong',
    [CHECK_STATUS.CANCELLED]: 'Đã hủy',
};

export const CHECK_STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: CHECK_STATUS.IN_PROGRESS, label: CHECK_STATUS_LABEL[CHECK_STATUS.IN_PROGRESS] },
    { value: CHECK_STATUS.COMPLETED, label: CHECK_STATUS_LABEL[CHECK_STATUS.COMPLETED] },
    { value: CHECK_STATUS.CANCELLED, label: CHECK_STATUS_LABEL[CHECK_STATUS.CANCELLED] },
];

export const DATE_FILTER_OPTIONS = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'all', label: 'Tất cả' },
];
