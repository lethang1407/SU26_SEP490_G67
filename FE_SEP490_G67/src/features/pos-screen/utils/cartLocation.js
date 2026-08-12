export const locationKey = (loc) =>
    loc ? `${loc.locationId}-${loc.batchId}` : '';

export function toBaseUnits(item) {
    const unit = (item.units ?? []).find(
        (u) => String(u.id) === String(item.productUnitId)
    );
    const factor = Number(unit?.unitBase) || 1;
    return item.qty * factor;
}

export const findLocation = (item, key) =>
    (item.locations ?? []).find((loc) => locationKey(loc) === key) ?? null;

export const selectedLocation = (item) =>
    findLocation(item, item.locationKey);

export function isLocationShort(item) {
    const loc = selectedLocation(item);
    if (!loc) return false;
    return Number(loc.quantity ?? 0) < toBaseUnits(item);
}

export const needsLocationPick = (item) => !selectedLocation(item);

export const hasLocationProblem = (item) =>
    needsLocationPick(item) || isLocationShort(item);

const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('vi-VN') : null;

export function formatLocationOption(loc) {
    const zone = loc.zoneType === 'SALES' ? 'Quầy' : 'Kho';
    const parts = [
        `${zone} ${loc.label}`,
        loc.batchCode ? `Lô ${loc.batchCode}` : null,
        `còn ${Number(loc.quantity ?? 0).toLocaleString('vi-VN')}`,
    ];
    const expiry = formatDate(loc.expiryDate);
    if (expiry) parts.push(`HSD ${expiry}`);
    return parts.filter(Boolean).join(' · ');
}

export function formatLocationShort(loc) {
    if (!loc) return null;
    const zone = loc.zoneType === 'SALES' ? 'Quầy' : 'Kho';
    return `${zone} ${loc.label}`;
}
