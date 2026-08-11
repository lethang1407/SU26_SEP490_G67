/**
 * Chọn vị trí lấy hàng cho từng dòng giỏ hàng POS.
 *
 * Mỗi lựa chọn là một cặp (vị trí, lô): một ô kho chứa được nhiều lô của cùng
 * một sản phẩm, nên chỉ locationId là chưa đủ để xác định lô sẽ bị trừ.
 */

export const locationKey = (loc) =>
    loc ? `${loc.locationId}-${loc.batchId}` : '';

/** Tồn kho đếm theo đơn vị cơ sở, còn thu ngân nhập theo đơn vị đang chọn. */
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

/**
 * Vị trí đang chọn không đủ hàng cho số lượng hiện tại. Phải tính lại mỗi lần
 * đổi số lượng hoặc đổi đơn vị, không chỉ lúc thêm vào giỏ.
 */
export function isLocationShort(item) {
    const loc = selectedLocation(item);
    if (!loc) return false;
    return Number(loc.quantity ?? 0) < toBaseUnits(item);
}

/** Chưa chọn được vị trí nào — SP không có trên khu bán, thu ngân phải tự chọn. */
export const needsLocationPick = (item) => !selectedLocation(item);

/** Dòng chặn thanh toán: chưa chọn vị trí, hoặc vị trí đã chọn không đủ hàng. */
export const hasLocationProblem = (item) =>
    needsLocationPick(item) || isLocationShort(item);

const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('vi-VN') : null;

/** Nhãn một dòng trong dropdown: đủ thông tin để thu ngân đối chiếu với thùng hàng. */
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

/** Nhãn gọn khi chỉ có một lựa chọn và không cần mở dropdown. */
export function formatLocationShort(loc) {
    if (!loc) return null;
    const zone = loc.zoneType === 'SALES' ? 'Quầy' : 'Kho';
    return `${zone} ${loc.label}`;
}
