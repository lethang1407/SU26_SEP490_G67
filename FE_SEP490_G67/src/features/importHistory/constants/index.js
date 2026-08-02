export const IMPORT_HISTORY_ROUTES = {
  list: '/admin/warehouse/import-history',
};

export const IMPORT_HISTORY_PAGE_SIZE = 5;

export const IMPORT_STATUS = {
  MATCHED: 'matched',
  PENDING: 'pending',
  MISMATCH: 'mismatch',
};

export const IMPORT_STATUS_META = {
  [IMPORT_STATUS.MATCHED]: {
    label: 'Khớp - Đã khóa',
    className: 'matched',
  },
  [IMPORT_STATUS.PENDING]: {
    label: 'Chờ kiểm hàng',
    className: 'pending',
  },
  [IMPORT_STATUS.MISMATCH]: {
    label: 'Lệch - Chờ xử lý',
    className: 'mismatch',
  },
};

export const DATE_RANGE_PRESETS = [
  { value: 'this-week', label: 'Tuần này' },
  { value: 'this-month', label: 'Tháng này' },
  { value: 'last-month', label: 'Tháng trước' },
  { value: 'all', label: 'Tất cả thời gian' },
];
