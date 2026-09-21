export const pickKey = (loc) =>
    loc ? `${loc.locationId}-${loc.batchId ?? 'all'}` : '';

export const orderedLocations = (item) => item?.locations ?? [];

/** Lô quá hạn kho chưa xử lý: vẫn hiện để thu ngân biết, nhưng không lấy được. */
export const isExpired = (loc) => loc?.expired === true;

/**
 * Dòng lấy được hàng. Dòng không có locationId là vị trí giả của chế độ offline —
 * gửi lên BE sẽ bị bỏ qua, nên coi như không có vị trí để FIFO toàn kho lo.
 */
export const sellableLocations = (item) =>
    orderedLocations(item).filter((loc) => loc?.locationId != null && !isExpired(loc));

export const hasPickableStock = (item) => sellableLocations(item).length > 0;

/** Số đơn vị cơ sở trong một đơn vị bán đang chọn. */
export function unitFactor(item) {
    const unit = (item.units ?? []).find(
        (u) => String(u.id) === String(item.productUnitId)
    );
    return Number(unit?.unitBase) || 1;
}

/**
 * Số đơn vị bán tối đa lấy được ở một dòng. Tồn lưu theo đơn vị cơ sở nên làm tròn
 * xuống: ô còn 95 lon thì lấy được 15 lốc 6 — lốc không xé lẻ giữa hai ô.
 */
export const capacityOf = (item, loc) =>
    Math.floor(Number(loc?.quantity ?? 0) / unitFactor(item));

const sumQty = (map) => Object.values(map).reduce((sum, q) => sum + Number(q || 0), 0);

function shiftTotal(item, map, delta) {
    const locs = sellableLocations(item);
    const next = { ...map };
    if (delta > 0) {
        let rest = delta;
        for (const loc of locs) {
            if (rest <= 0) break;
            const key = pickKey(loc);
            const room = capacityOf(item, loc) - (next[key] ?? 0);
            if (room <= 0) continue;
            const add = Math.min(room, rest);
            next[key] = (next[key] ?? 0) + add;
            rest -= add;
        }
        if (rest > 0) {
            const lastKey = pickKey(locs[locs.length - 1]);
            next[lastKey] = (next[lastKey] ?? 0) + rest;
        }
    } else if (delta < 0) {
        let rest = -delta;
        for (const loc of [...locs].reverse()) {
            if (rest <= 0) break;
            const key = pickKey(loc);
            const take = Math.min(next[key] ?? 0, rest);
            if (take <= 0) continue;
            next[key] -= take;
            if (next[key] <= 0) delete next[key];
            rest -= take;
        }
    }
    return next;
}

/** Chia `qty` theo FIFO từ đầu, bỏ qua mọi phân bổ cũ. */
export const allocateFifo = (item, qty) => shiftTotal(item, {}, qty);

export function pickQtyOf(item) {
    if (!hasPickableStock(item)) return {};
    return item.pickQty ?? allocateFifo(item, item.qty);
}

export const qtyAt = (item, loc) => pickQtyOf(item)[pickKey(loc)] ?? 0;

/** Thu ngân sửa số lượng ở một dòng vị trí → tổng dòng hàng cộng lại theo. */
export function withPickQty(item, key, qty) {
    const map = { ...pickQtyOf(item) };
    if (qty > 0) map[key] = qty;
    else delete map[key];
    return { ...item, pickQty: map, qty: sumQty(map) };
}

/** Thu ngân sửa ô "Số lượng" tổng (hoặc quét thêm một cái) → chia lại phần chênh. */
export function withTotalQty(item, qty) {
    if (!hasPickableStock(item)) return { ...item, qty };
    const map = pickQtyOf(item);
    return { ...item, pickQty: shiftTotal(item, map, qty - sumQty(map)), qty };
}

export const withFifoPicks = (item) =>
    hasPickableStock(item) ? { ...item, pickQty: allocateFifo(item, item.qty) } : item;

/** Số nhập ở dòng này quy ra đơn vị cơ sở vượt tồn thật của dòng. */
export const isOverCapacity = (item, loc) =>
    qtyAt(item, loc) * unitFactor(item) > Number(loc?.quantity ?? 0);

/**
 * Chặn thanh toán khi có dòng vượt tồn. Tổng lệch `qty` chỉ xảy ra với dữ liệu hỏng,
 * nhưng BE sẽ từ chối ngay (STOCK_PICK_QUANTITY_MISMATCH) nên chặn luôn ở đây.
 */
export function hasLocationProblem(item) {
    if (!hasPickableStock(item)) return false;
    return sellableLocations(item).some((loc) => isOverCapacity(item, loc))
        || sumQty(pickQtyOf(item)) !== Number(item.qty);
}

export function formatLocationShort(loc) {
    if (!loc) return null;
    const raw = loc.label || loc.zoneCode || String(loc.locationId);
    const upper = String(raw).trim().toUpperCase();
    if (upper === 'IMPORTED' || upper === 'NHAP-MOI' || upper === 'NH') {
        return 'Khu nhập hàng';
    }
    return raw;
}

/** Các dòng đang lấy hàng, theo thứ tự FIFO. */
export const allocationParts = (item) =>
    sellableLocations(item)
        .filter((loc) => qtyAt(item, loc) > 0)
        .map((loc) => ({
            key: pickKey(loc),
            label: formatLocationShort(loc),
            quantity: qtyAt(item, loc),
        }));

/** Nhãn gọn trên nút chọn vị trí. */
export function locationSummary(item) {
    const parts = allocationParts(item);
    if (parts.length === 0) return null;
    return parts.length === 1 ? parts[0].label : `${parts[0].label} +${parts.length - 1}`;
}

/**
 * Payload gửi BE. Có vị trí thì luôn gửi kèm số lượng từng dòng; rỗng (sản phẩm
 * chưa tải được vị trí, ví dụ thêm lúc offline) = BE tự trừ FIFO toàn kho.
 */
export const toStockPicks = (item) =>
    allocationParts(item).map((part) => {
        const loc = sellableLocations(item).find((l) => pickKey(l) === part.key);
        return {
            locationId: loc.locationId,
            batchId: loc.batchId ?? null,
            quantity: part.quantity,
        };
    });
