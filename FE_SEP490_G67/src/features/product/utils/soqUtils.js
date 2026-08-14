/**
 * Cover cascade (UI): PANEL (this order) > PRODUCT override > CATEGORY > STORE
 */
export function resolveEffectiveCoverDays({
  panelOverride,
  productOverride,
  categoryCoverDays,
  storeCoverDays = 7,
}) {
  if (panelOverride != null && panelOverride > 0) {
    return { days: panelOverride, source: 'PANEL', label: 'Lần nhập này' };
  }
  if (productOverride != null && productOverride > 0) {
    return { days: productOverride, source: 'PRODUCT', label: 'Cài riêng SP' };
  }
  if (categoryCoverDays != null && categoryCoverDays > 0) {
    return { days: categoryCoverDays, source: 'CATEGORY', label: 'Theo nhóm' };
  }
  return { days: storeCoverDays, source: 'STORE', label: 'Mặc định cửa hàng' };
}

export function calcSoq({
  avgDaily,
  onHand = 0,
  leadTimeDays = 3,
  coverDays = 7,
  safetyDays = 1,
  usableSellDays = Number.POSITIVE_INFINITY,
}) {
  const horizon = leadTimeDays + coverDays + safetyDays;
  const soqRaw = Math.max(0, avgDaily * horizon - onHand);
  const capped = Number.isFinite(usableSellDays)
    ? Math.min(soqRaw, avgDaily * usableSellDays)
    : soqRaw;
  return Math.ceil(capped);
}
