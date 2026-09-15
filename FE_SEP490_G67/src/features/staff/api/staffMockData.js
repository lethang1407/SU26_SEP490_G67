export const STAFF_LIST = [
    {
        id: 1,
        name: 'Nguyễn Thành Nam',
        phone: '0912 345 678',
        position: 'Nhân viên',
        username: 'nv.thanhnam',
        password: '12345678',
        systemRole: 'staff',
        permissions: ['pos'],
    },
    {
        id: 2,
        name: 'Nguyễn Thành A',
        phone: '0912 345 678',
        position: 'Quản lý',
        username: 'nv.thanha',
        password: '12345678',
        systemRole: 'manager',
        permissions: ['warehouse'],
    },
];

export const STAFF_POSITIONS = ['Nhân viên', 'Quản lý'];

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
