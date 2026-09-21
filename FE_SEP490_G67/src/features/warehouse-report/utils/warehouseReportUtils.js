export function toIsoDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIso(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatVnDate(date) {
  if (!date) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

/** Số năm trong dropdown, tính ngược từ năm hiện tại. */
const YEAR_SPAN = 20;

export function buildYearOptions(now = new Date()) {
  const current = now.getFullYear();
  return Array.from({ length: YEAR_SPAN }, (_, i) => {
    const year = current - i;
    return { value: String(year), label: String(year) };
  });
}

/** Khoảng ngày mặc định theo năm (01/01 → 31/12). */
export function resolveYearRange(year) {
  const y = Number(year);
  if (!y) return { from: '', to: '' };
  return {
    from: toIsoDate(new Date(y, 0, 1)),
    to: toIsoDate(new Date(y, 11, 31)),
  };
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString('vi-VN')} ₫`;
}

export function formatQty(value) {
  const n = Number(value || 0);
  return n.toLocaleString('vi-VN');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatShortPrice(value) {
  const n = Number(value || 0);
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString('vi-VN');
}
