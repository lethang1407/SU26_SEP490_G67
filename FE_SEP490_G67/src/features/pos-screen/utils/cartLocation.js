export const pickKey = (loc) =>
    loc ? `${loc.locationId}-${loc.batchId ?? 'all'}` : '';

export const selectedKeys = (item) => item?.pickKeys ?? [];

export const selectedPicks = (item) =>
    (item?.locations ?? []).filter((loc) => selectedKeys(item).includes(pickKey(loc)));

/** Số đơn vị cơ sở trong một đơn vị bán đang chọn. */
export function unitFactor(item) {
    const unit = (item.units ?? []).find(
        (u) => String(u.id) === String(item.productUnitId)
    );
    return Number(unit?.unitBase) || 1;
}

export function toBaseUnits(item) {
    return item.qty * unitFactor(item);
}

/** Tổng tồn (đơn vị cơ sở) của các lô đã tick. */
export const selectedQuantity = (item) =>
    selectedPicks(item).reduce((sum, loc) => sum + Number(loc.quantity ?? 0), 0);

export function allocateQuantity(item) {
    let remaining = toBaseUnits(item);
    const parts = [];
    for (const loc of selectedPicks(item)) {
        if (remaining <= 0) break;
        const take = Math.min(Number(loc.quantity ?? 0), remaining);
        if (take > 0) {
            parts.push({
                key: pickKey(loc),
                locationId: loc.locationId,
                label: formatLocationShort(loc),
                quantity: take,
            });
            remaining -= take;
        }
    }
    return parts;
}

export const needsLocationPick = (item) => selectedPicks(item).length === 0;

export const isLocationShort = (item) =>
    !needsLocationPick(item) && selectedQuantity(item) < toBaseUnits(item);

export const hasLocationProblem = (item) =>
    needsLocationPick(item) || isLocationShort(item);

const zoneName = (loc) => (loc?.zoneType === 'SALES' ? 'Quầy' : 'Kho');

export function formatLocationShort(loc) {
    if (!loc) return null;
    return `${zoneName(loc)} ${loc.label}`;
}

/** Nhãn gọn trên nút chọn: "Quầy A1" hoặc "Quầy A1 +2 lô". */
export function locationSummary(item) {
    const picked = selectedPicks(item);
    if (picked.length === 0) return null;
    const first = formatLocationShort(picked[0]);
    return picked.length === 1 ? first : `${first} +${picked.length - 1} lô`;
}

/** Payload gửi BE: BE trừ đúng lô này, theo đúng thứ tự trong mảng. */
export const toStockPicks = (item) =>
    selectedPicks(item).map((loc) => ({
        locationId: loc.locationId,
        batchId: loc.batchId ?? null,
    }));
