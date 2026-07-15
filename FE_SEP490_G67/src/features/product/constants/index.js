export const PRODUCT_ROUTES = {
    list: '/admin/products',
    create: '/admin/products/create',
    detail: (id) => `/admin/products/${id}`,
    edit: (id) => `/admin/products/${id}/edit`,
};

export const EDIT_PRODUCT_FORM_ID = 'edit-product-form';

export const ADD_PRODUCT_FORM_ID = 'add-product-form';

export const CATEGORY_FILTER = {
    ALL: 'all',
};

export const STATUS_FILTER = {
    ALL: 'all',
    IN_STOCK: 'in_stock',
    OUT_OF_STOCK: 'out_of_stock',
};

export const SUPPLIER_FILTER = {
    ALL: 'all',
};

export const PRODUCT_CATEGORIES = [
    'Gia vị',
    'Gia vị & Chế biến',
    'Thực phẩm khô',
    'Đồ uống',
    'Dầu ăn',
    'Hóa mỹ phẩm',
    'Sữa',
    'Bánh kẹo',
];

export const PRODUCT_SUPPLIERS = [
    'Công ty TNHH Thực phẩm ABC',
    'Nhà phân phối XYZ',
    'Công ty Coca-Cola Việt Nam',
    'Unilever Việt Nam',
    'Vinamilk',
    'Mondelez Kinh Đô',
];

export const CATEGORY_OPTIONS = [
    { value: CATEGORY_FILTER.ALL, label: 'Tất cả danh mục' },
    ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: category })),
];

export const STATUS_OPTIONS = [
    { value: STATUS_FILTER.ALL, label: 'Tất cả trạng thái' },
    { value: STATUS_FILTER.IN_STOCK, label: 'Còn hàng' },
    { value: STATUS_FILTER.OUT_OF_STOCK, label: 'Hết hàng' },
];

export const SUPPLIER_OPTIONS = [
    { value: SUPPLIER_FILTER.ALL, label: 'Tất cả NCC' },
    ...PRODUCT_SUPPLIERS.map((supplier) => ({ value: supplier, label: supplier })),
];
