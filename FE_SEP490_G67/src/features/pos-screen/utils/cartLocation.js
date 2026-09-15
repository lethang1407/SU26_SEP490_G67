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

/** True khi chưa chọn ô/lô tường minh → checkout đi FIFO (không phải lỗi). */
export const needsLocationPick = (item) => selectedPicks(item).length === 0;

export const isLocationShort = (item) =>
    !needsLocationPick(item) && selectedQuantity(item) < toBaseUnits(item);

/** Chỉ lỗi khi đã chọn ô nhưng không đủ SL. FIFO (không pick) là hợp lệ. */
export const hasLocationProblem = (item) => isLocationShort(item);

export function formatLocationShort(loc) {
    if (!loc) return null;
    return loc.label || loc.zoneCode || String(loc.locationId);
}

/** Nhãn gọn trên nút chọn; null → UI hiện 「Tự động (FIFO)」. */
export function locationSummary(item) {
    const picked = selectedPicks(item);
    if (picked.length === 0) return null;
    const first = formatLocationShort(picked[0]);
    return picked.length === 1 ? first : `${first} +${picked.length - 1} lô`;
}

/** Payload gửi BE: rỗng = FIFO; có phần tử = trừ đúng ô/lô đã chọn. */
export const toStockPicks = (item) =>
    selectedPicks(item).map((loc) => ({
        locationId: loc.locationId,
        batchId: loc.batchId ?? null,
    }));

/**
 * Sắp dòng vị trí theo FIFO (ngày nhập): lô về kho trước đứng trước.
 * Phải khớp ORDER BY của BE (BatchLocationRepository) — lệch nhau là thu ngân nhìn
 * một thứ tự mà checkout lại trừ theo thứ tự khác.
 */
export function sortLocationsByFifo(locations) {
    return [...(locations ?? [])].sort((a, b) => {
        const recvA = a?.receivedDate ? Date.parse(a.receivedDate) : Number.POSITIVE_INFINITY;
        const recvB = b?.receivedDate ? Date.parse(b.receivedDate) : Number.POSITIVE_INFINITY;
        if (recvA !== recvB) return recvA - recvB;
        return String(a?.label ?? '').localeCompare(String(b?.label ?? ''));
    });
}
