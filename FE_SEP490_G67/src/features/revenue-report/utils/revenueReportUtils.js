/** Số năm được đưa vào dropdown "Năm", tính ngược từ năm hiện tại. */
const YEAR_SPAN = 20;

export const QUARTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: '1', label: 'Quý 1' },
  { value: '2', label: 'Quý 2' },
  { value: '3', label: 'Quý 3' },
  { value: '4', label: 'Quý 4' },
];

export function buildYearOptions(now = new Date()) {
  const current = now.getFullYear();
  return Array.from({ length: YEAR_SPAN }, (_, i) => {
    const year = current - i;
    return { value: String(year), label: String(year) };
  });
}

export function toIsoDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Khoảng ngày mặc định ứng với cặp năm/quý đang chọn. Không chọn quý thì lấy
 * trọn năm, để hai ô "Từ ngày"/"Đến ngày" luôn khớp với bộ lọc phía trên.
 */
export function resolveRangeFor(year, quarter) {
  const y = Number(year);
  if (!y) return { from: '', to: '' };

  const q = Number(quarter);
  if (!q) {
    return { from: toIsoDate(new Date(y, 0, 1)), to: toIsoDate(new Date(y, 11, 31)) };
  }
  const startMonth = (q - 1) * 3;
  return {
    from: toIsoDate(new Date(y, startMonth, 1)),
    to: toIsoDate(new Date(y, startMonth + 3, 0)),
  };
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString('vi-VN')} đ`;
}

/** Tiền có dấu — dùng cho các ô âm (hàng trả lại, phiếu trả) để giữ dấu trừ. */
export function formatSignedMoney(value) {
  const n = Number(value || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toLocaleString('vi-VN')} đ`;
}

/** Rút gọn cho trục tung biểu đồ: 70tr, 850k, 0. */
export function formatAxisMoney(value) {
  const n = Number(value || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}t`;
  if (abs >= 1_000_000) return `${sign}${Math.round(abs / 1_000_000)}tr`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return String(n);
}

export function formatPercent(value, digits = 1) {
  const n = Number(value || 0);
  return `${n.toFixed(digits)}%`;
}

/** Phần trăm so với kỳ trước — luôn kèm dấu để đọc được chiều tăng/giảm. */
export function formatDeltaPercent(value, digits = 0) {
  const n = Number(value || 0);
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export function formatVnDate(iso) {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Giờ chốt số liệu hiển thị trên thanh tiêu đề. */
export function formatDataFreshness(date = new Date()) {
  const time = date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Dữ liệu: Hôm nay ${time}`;
}
