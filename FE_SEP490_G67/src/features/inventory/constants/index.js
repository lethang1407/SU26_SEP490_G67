export const INVENTORY_ROUTES = {
    list: '/admin/warehouse/inventory',
    check: '/admin/warehouse/check',
};

export const CATEGORY_FILTER = {
    ALL: 'all',
};

export const INVENTORY_STATUS = {
    ALL: 'all',
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    OVERSTOCK: 'overstock',
};

export const INVENTORY_STATUS_LABEL = {
    [INVENTORY_STATUS.IN_STOCK]: 'Còn hàng',
    [INVENTORY_STATUS.LOW_STOCK]: 'Sắp hết',
    [INVENTORY_STATUS.OUT_OF_STOCK]: 'Hết hàng',
    [INVENTORY_STATUS.OVERSTOCK]: 'Tồn cao',
};

export const INVENTORY_STATUS_OPTIONS = [
    { value: INVENTORY_STATUS.ALL, label: 'Tình trạng kho' },
    { value: INVENTORY_STATUS.IN_STOCK, label: 'Còn hàng' },
    { value: INVENTORY_STATUS.LOW_STOCK, label: 'Sắp hết' },
    { value: INVENTORY_STATUS.OUT_OF_STOCK, label: 'Hết hàng' },
    { value: INVENTORY_STATUS.OVERSTOCK, label: 'Tồn cao' },
];
