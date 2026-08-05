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

export const SHELF_SIZE = {
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
};

/** Map size từ BE (SM|MD|LG) sang key FE. */
export function normalizeShelfSize(raw) {
    const value = String(raw ?? '').trim().toUpperCase();
    if (value === 'SM' || value === 'SMALL') return SHELF_SIZE.SM;
    if (value === 'LG' || value === 'LARGE') return SHELF_SIZE.LG;
    if (value === 'MD' || value === 'MEDIUM') return SHELF_SIZE.MD;
    if (value === SHELF_SIZE.SM || value === SHELF_SIZE.MD || value === SHELF_SIZE.LG) {
        return value;
    }
    return SHELF_SIZE.MD;
}

export const SHELF_SIZE_LABEL = {
    [SHELF_SIZE.SM]: 'Ô bé',
    [SHELF_SIZE.MD]: 'Ô vừa',
    [SHELF_SIZE.LG]: 'Ô to',
};

export const SHELF_SIZE_OPTIONS = [
    { value: 'SM', label: SHELF_SIZE_LABEL[SHELF_SIZE.SM] },
    { value: 'MD', label: SHELF_SIZE_LABEL[SHELF_SIZE.MD] },
    { value: 'LG', label: SHELF_SIZE_LABEL[SHELF_SIZE.LG] },
];

/** Sức chứa ước tính (đơn vị số lượng) theo kích thước ô. */
export const SHELF_CAPACITY = {
    [SHELF_SIZE.SM]: 80,
    [SHELF_SIZE.MD]: 200,
    [SHELF_SIZE.LG]: 500,
};
