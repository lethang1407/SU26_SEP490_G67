import { api } from '@/lib/api-clien';

export const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'DEBT', label: 'Ghi nợ' },
];

const PAYMENT_METHOD_LABELS = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  BANK: 'Chuyển khoản',
  BANK_TRANSFER: 'Chuyển khoản',
  DEBT: 'Ghi nợ',
};

export function paymentMethodLabel(method) {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[String(method).toUpperCase()] ?? method;
}

function buildFilterParams({ year, quarter, from, to, paymentMethod, staffId } = {}) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (quarter) params.set('quarter', String(quarter));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (staffId) params.set('staffId', String(staffId));
  return params;
}

export const revenueReportApi = {
  /** KPI, chuỗi số liệu theo tháng/quý và các điểm đáng chú ý của kỳ đang lọc. */
  getOverview: async (filters = {}) => {
    const params = buildFilterParams(filters);
    const response = await api.get(`/revenue-report/overview?${params.toString()}`);
    return response.result;
  },

  /** Danh sách phiếu bán và phiếu trả phát sinh trong kỳ, phân trang phía server. */
  getTransactions: async ({ keyword, page = 0, size = 10, ...filters } = {}) => {
    const params = buildFilterParams(filters);
    params.set('page', String(page));
    params.set('size', String(size));
    if (keyword) params.set('keyword', keyword);
    const response = await api.get(`/revenue-report/transactions?${params.toString()}`);
    return response.result;
  },

  /**
   * Dropdown "Nhân viên bán hàng": chủ cửa hàng + nhân viên, BE đã xếp chủ trước rồi tên A→Z.
   * Xếp lại ở FE để thứ tự không phụ thuộc vào BE.
   */
  listStaffOptions: async () => {
    const response = await api.get('/revenue-report/staff-options');
    const collator = new Intl.Collator('vi', { sensitivity: 'base' });
    return (response.result ?? [])
      .map((s) => ({ value: String(s.id), label: s.name, owner: Boolean(s.owner) }))
      .sort((a, b) => Number(b.owner) - Number(a.owner) || collator.compare(a.label, b.label));
  },
};
