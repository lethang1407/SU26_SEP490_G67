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
