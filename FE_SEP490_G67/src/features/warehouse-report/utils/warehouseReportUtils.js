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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function startOfQuarter(date) {
  const d = startOfDay(date);
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

/** @returns {{ from: string|null, to: string|null }} */
export function resolvePresetRange(preset) {
  const today = startOfDay(new Date());

  switch (preset) {
    case 'today':
      return { from: toIsoDate(today), to: toIsoDate(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: toIsoDate(y), to: toIsoDate(y) };
    }
    case 'last-7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toIsoDate(from), to: toIsoDate(today) };
    }
    case 'last-30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toIsoDate(from), to: toIsoDate(today) };
    }
    case 'this-week':
      return { from: toIsoDate(startOfWeekMonday(today)), to: toIsoDate(today) };
    case 'this-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toIsoDate(from), to: toIsoDate(today) };
    }
    case 'this-quarter':
      return { from: toIsoDate(startOfQuarter(today)), to: toIsoDate(today) };
    case 'this-year': {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: toIsoDate(from), to: toIsoDate(today) };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
}

export function detectPreset(from, to) {
  if (!from && !to) return 'all';
  const presets = [
    'today',
    'yesterday',
    'last-7',
    'last-30',
    'this-week',
    'this-month',
    'this-quarter',
    'this-year',
  ];
  for (const key of presets) {
    const range = resolvePresetRange(key);
    if (range.from === from && range.to === to) return key;
  }
  return 'custom';
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
