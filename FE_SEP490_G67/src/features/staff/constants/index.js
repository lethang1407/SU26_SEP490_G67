export const STAFF_ROUTES = {
    list: '/admin/staff',
    create: '/admin/staff/create',
    detail: (id) => `/admin/staff/${id}`,
};

export const STAFF_ROLES = [
    { value: 'staff', label: 'Nhân viên' },
];

/** Role mặc định khi thêm nhân viên (khớp DB). */
export const DEFAULT_STAFF_ROLES = ['staff'];

export const STAFF_FORM_ID = 'staff-info-form';

export const ADD_STAFF_FORM_ID = 'add-staff-form';

export const ALL_ROLE_TEMPLATES = 'ALL';

export const ROLE_TEMPLATE_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tất cả mẫu vai trò' },
    { value: 'CASHIER', label: 'Thu ngân (Bán hàng)' },
    { value: 'WAREHOUSE_STAFF', label: 'Nhân viên Kho' },
    { value: 'ACCOUNTANT', label: 'Kế toán / Thu chi' },
    { value: 'ALL_ROUNDER', label: 'Nhân viên Đa năng' },
    { value: 'FULL_ACCESS', label: 'Toàn quyền' },
    { value: 'CUSTOM', label: 'Tùy chỉnh riêng' },
    { value: 'NO_PERMISSION', label: 'Chưa phân quyền' },
];

