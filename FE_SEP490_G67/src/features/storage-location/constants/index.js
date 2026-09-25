export const STORAGE_LOCATION_ROUTES = {
    list: '/admin/warehouse/locations',
};

/** Neo (#hash) để dashboard dẫn thẳng xuống khu đổi trả trên màn Vị trí kho. */
export const RETURN_HOLD_ANCHOR = 'return-hold';

export const LOCATION_STATUS = {
    ALL: 'all',
    EMPTY: 'empty',
    OCCUPIED: 'occupied',
    NEAR_EXPIRY: 'near_expiry',
    FULL: 'full',
};

export const LOCATION_STATUS_LABEL = {
    [LOCATION_STATUS.EMPTY]: 'Trống',
    [LOCATION_STATUS.OCCUPIED]: 'Có hàng',
    [LOCATION_STATUS.NEAR_EXPIRY]: 'Sắp hết HSD',
    [LOCATION_STATUS.FULL]: 'Đầy',
};

export const LOCATION_STATUS_OPTIONS = [
    { value: LOCATION_STATUS.ALL, label: 'Tất cả trạng thái' },
    { value: LOCATION_STATUS.OCCUPIED, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.OCCUPIED] },
    { value: LOCATION_STATUS.EMPTY, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.EMPTY] },
    { value: LOCATION_STATUS.NEAR_EXPIRY, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.NEAR_EXPIRY] },
    { value: LOCATION_STATUS.FULL, label: LOCATION_STATUS_LABEL[LOCATION_STATUS.FULL] },
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

export const ZONE_TYPE = {
    /** @deprecated Đã gộp vào WAREHOUSE */
    SALES: 'SALES',
    WAREHOUSE: 'WAREHOUSE',
    RETURN_HOLD: 'RETURN_HOLD',
};

export const ZONE_TYPE_LABEL = {
    [ZONE_TYPE.SALES]: 'Kho',
    [ZONE_TYPE.WAREHOUSE]: 'Kho',
    [ZONE_TYPE.RETURN_HOLD]: 'Đổi trả',
};

/** Chỉ còn WAREHOUSE — SALES đã gộp. */
export const ZONE_TYPE_OPTIONS = [
    { value: ZONE_TYPE.WAREHOUSE, label: 'Khu kho' },
];

export const RETURN_HOLD_ZONE_CODE = 'RT';
export const RETURN_HOLD_LOCATION_LABEL = 'RT-HOLD';

/** Vị trí nhận hàng mới nhập (chờ xếp kệ). */
export const RECEIVING_ZONE_CODE = 'NH';
/** Label kỹ thuật trong DB — không hiện trên UI. */
export const RECEIVING_LOCATION_LABEL = 'IMPORTED';
export const RECEIVING_DISPLAY_NAME = 'Khu nhập hàng';

export function normalizeZoneType(raw) {
    const value = String(raw ?? '').trim().toUpperCase();
    if (value === ZONE_TYPE.RETURN_HOLD) return ZONE_TYPE.RETURN_HOLD;
    // SALES và mọi giá trị khác → WAREHOUSE
    return ZONE_TYPE.WAREHOUSE;
}

export function isReturnHoldLocation(location) {
    return normalizeZoneType(location?.zoneType) === ZONE_TYPE.RETURN_HOLD;
}

export function isReceivingLocation(location) {
    const label = String(location?.label ?? '').trim().toUpperCase();
    const zone = String(location?.zone ?? '').trim().toUpperCase();
    return (
        label === RECEIVING_LOCATION_LABEL ||
        label === 'NHAP-MOI' ||
        zone === RECEIVING_ZONE_CODE
    );
}

/** Tên hiển thị ô kệ (ô nhập hàng → "Khu nhập hàng"). */
export function getLocationDisplayLabel(location) {
    if (!location) return '—';
    if (isReceivingLocation(location)) {
        return location.displayLabel || RECEIVING_DISPLAY_NAME;
    }
    return location.displayLabel || location.label || '—';
}

/** Tiêu đề khu trên lưới / modal (không thêm tiền tố "Kệ "). */
export function getZoneDisplayTitle(groupOrZone) {
    const zone = String(groupOrZone?.zone ?? groupOrZone ?? '').trim().toUpperCase();
    if (zone === RECEIVING_ZONE_CODE) {
        return RECEIVING_DISPLAY_NAME;
    }
    const rawTitle = groupOrZone?.zoneTitle
        ? String(groupOrZone.zoneTitle).trim()
        : '';
    // Dữ liệu cũ có thể đã lưu "Kệ XXX" — bỏ tiền tố khi hiển thị.
    const title = rawTitle.replace(/^Kệ\s+/i, '').trim();
    if (title) {
        return title;
    }
    return zone || '—';
}
