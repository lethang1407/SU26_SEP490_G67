export const STAFF_ROUTES = {
    list: '/admin/staff',
    create: '/admin/staff/create',
    detail: (id) => `/admin/staff/${id}`,
};

export const STAFF_ROLES = [
    { value: 'cashier', label: 'Thu ngân – bán hàng POS' },
    { value: 'accountant', label: 'Kế toán' },
    { value: 'warehouse', label: 'Nhân viên kho hàng' },
];

export const DEFAULT_STAFF_ROLES = ['cashier'];

export const STAFF_FORM_ID = 'staff-info-form';

export const ADD_STAFF_FORM_ID = 'add-staff-form';

export const ALL_POSITIONS = 'Tất cả vị trí';

export const STAFF_POSITIONS = ['Thu ngân', 'Kiểm kho', 'Kế toán'];

export const NAME_SORT_ASC = 'name-asc';
export const NAME_SORT_DESC = 'name-desc';

export const NAME_SORT_OPTIONS = [
    { value: NAME_SORT_ASC, label: 'A → Z' },
    { value: NAME_SORT_DESC, label: 'Z → A' },
];
