export const STAFF_ROUTES = {
    list: '/admin/staff',
    create: '/admin/staff/create',
    detail: (id) => `/admin/staff/${id}`,
};

export const SYSTEM_ROLES = [
    { value: 'pos', label: 'Nhân viên bán hàng (POS)' },
    { value: 'warehouse', label: 'Nhân viên kho hàng' },
    { value: 'accountant', label: 'Kế toán' },
    { value: 'cashier', label: 'Thu ngân' },
];

export const STAFF_PERMISSIONS = [
    {
        id: 'pos',
        title: 'Bán hàng (POS)',
        description: 'Tạo đơn, quét mã, in hóa đơn',
        icon: 'ShoppingCart',
        color: '#2563eb',
        bgColor: '#eff6ff',
    },
    {
        id: 'products',
        title: 'Sản phẩm',
        description: 'Thêm mới, sửa giá, danh mục',
        icon: 'Package',
        color: '#16a34a',
        bgColor: '#f0fdf4',
    },
    {
        id: 'warehouse',
        title: 'Kho hàng',
        description: 'Nhập kho, kiểm kho, xuất hủy',
        icon: 'Warehouse',
        color: '#d97706',
        bgColor: '#fffbeb',
    },
    {
        id: 'reports',
        title: 'Báo cáo',
        description: 'Xem doanh thu, lợi nhuận, chi phí',
        icon: 'BarChart3',
        color: '#dc2626',
        bgColor: '#fef2f2',
    },
];

export const DEFAULT_PERMISSIONS = ['pos'];

export const STAFF_FORM_ID = 'staff-info-form';

export const ADD_STAFF_FORM_ID = 'add-staff-form';
