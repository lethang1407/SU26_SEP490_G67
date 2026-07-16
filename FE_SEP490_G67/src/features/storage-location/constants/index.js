export const STORAGE_LOCATION_ROUTES = {
    list: '/admin/warehouse/locations',
};

export const LOCATION_STATUS = {
    ALL: 'all',
    EMPTY: 'empty',
    OCCUPIED: 'occupied',
    NEAR_EXPIRY: 'near_expiry',
};

export const LOCATION_STATUS_LABEL = {
    [LOCATION_STATUS.EMPTY]: 'Trống',
    [LOCATION_STATUS.OCCUPIED]: 'Có hàng',
    [LOCATION_STATUS.NEAR_EXPIRY]: 'Sắp hết hạn',
};

export const LOCATION_STATUS_OPTIONS = [
    { value: LOCATION_STATUS.ALL, label: 'Tất cả trạng thái' },
    { value: LOCATION_STATUS.OCCUPIED, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.OCCUPIED] },
    { value: LOCATION_STATUS.EMPTY, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.EMPTY] },
    { value: LOCATION_STATUS.NEAR_EXPIRY, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.NEAR_EXPIRY] },
];

export const VIEW_MODE = {
    GRID: 'grid',
    LIST: 'list',
};

export const NEAR_EXPIRY_DAYS = 7;
