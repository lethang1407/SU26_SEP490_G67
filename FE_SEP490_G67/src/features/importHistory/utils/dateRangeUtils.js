/** Build ISO date YYYY-MM-DD in local timezone */
function toIsoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Map FE date-range presets → { from, to } for API (LocalDate).
 * `all` → wide range so BE does not clamp to current month only.
 */
export function resolveImportDateRange(preset) {
  const now = new Date();
  const today = toIsoDate(now);

  if (preset === 'this-week') {
    const day = now.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);
    return { from: toIsoDate(start), to: today };
  }

  if (preset === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }

  if (preset === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }

  // all
  return { from: '2020-01-01', to: today };
}

export function monthTitleFromSummary(summary) {
  if (!summary?.monthLabel) return '';
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `THÁNG ${m}/${now.getFullYear()}`;
}
