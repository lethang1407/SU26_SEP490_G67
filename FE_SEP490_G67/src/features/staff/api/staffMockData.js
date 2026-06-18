export const STAFF_LIST = [
    {
        id: 1,
        name: 'Nguyễn Thành Nam',
        phone: '0912 345 678',
        position: 'Thu ngân',
        username: 'nv.thanhnam',
        password: '12345678',
        systemRole: 'cashier',
        permissions: ['pos'],
    },
    {
        id: 2,
        name: 'Nguyễn Thành A',
        phone: '0912 345 678',
        position: 'Kiểm kho',
        username: 'nv.thanha',
        password: '12345678',
        systemRole: 'warehouse',
        permissions: ['warehouse'],
    },
    {
        id: 3,
        name: 'Nguyễn Thành B',
        phone: '0912 345 678',
        position: 'Kế toán',
        username: 'nv.thanhb',
        password: '12345678',
        systemRole: 'accountant',
        permissions: ['reports'],
    },
    {
        id: 4,
        name: 'Nguyễn Thành C',
        phone: '0912 345 678',
        position: 'Thu ngân',
        username: 'nv.thanhc',
        password: '12345678',
        systemRole: 'pos',
        permissions: ['pos', 'products'],
    },
];

export const STAFF_POSITIONS = ['Thu ngân', 'Kiểm kho', 'Kế toán'];

export const ALL_POSITIONS = 'Tất cả vị trí';

export const NAME_SORT_ASC = 'name-asc';
export const NAME_SORT_DESC = 'name-desc';

export const NAME_SORT_OPTIONS = [
    { value: NAME_SORT_ASC, label: 'A → Z' },
    { value: NAME_SORT_DESC, label: 'Z → A' },
];

export function getStaffById(staffId) {
    const id = Number(staffId);
    return STAFF_LIST.find((staff) => staff.id === id) ?? null;
}
