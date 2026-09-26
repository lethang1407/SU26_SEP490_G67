/**
 * Logic dùng chung cho pop-up "Chuẩn bị đơn nhập hàng" (ImportPanel): trang Sản phẩm và
 * thẻ "Kho hàng" trên dashboard cùng dựng dòng, kiểm tra và tạo đơn theo một cách.
 */

/** Ngày đặt hàng: hôm nay, hoặc cộng thêm lead time của NCC nếu chọn "đặt theo lead time". */
export function resolveOrderDate(item, ov) {
  const timing =
    ov?.orderTiming ?? (item.orderToday === false ? 'lead' : 'today');
  if (timing !== 'lead') {
    return new Date().toISOString().slice(0, 10);
  }
  const days = Number(ov?.leadTimeDays ?? item.leadTimeDays ?? 3) || 3;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lỗi chặn tạo đơn: thiếu NCC hoặc số lượng <= 0. Rỗng = hợp lệ. */
export function validateLines(panelItems, overrides) {
  const errors = [];
  panelItems.forEach((item) => {
    const ov = overrides[item.productId] || {};
    const supplierId = ov.supplierId ?? item.supplierId;
    const qty = Number(ov.quantity ?? item.suggestedQty) || 0;
    const packQty = ov.quantity ?? item.suggestedQty;
    const name = item.productName || `SP #${item.productId}`;

    if (!supplierId) {
      errors.push(`Chưa chọn nhà cung cấp cho “${name}”.`);
    }
    if (packQty == null || Number(packQty) <= 0 || qty <= 0) {
      errors.push(`Số lượng phải > 0 cho “${name}”.`);
    }
  });

  return errors;
}

/**
 * Giá trị mặc định của một dòng từ gợi ý nhập hàng: NCC, giá, lead time, đơn vị cơ bản và
 * số lượng gợi ý quy ra đơn vị đó. Giá trị người dùng đã sửa ({@code existing}) được giữ.
 */
export function buildSuggestionOverride(suggestion, existing = {}) {
  const units = Array.isArray(suggestion.units) ? suggestion.units : [];
  const baseUnit =
    units.find((u) => u.isBase || Number(u.unitBase) === 1) ||
    units[0];
  const unitBase = Number(baseUnit?.unitBase ?? 1) || 1;
  return {
    ...existing,
    supplierId: existing.supplierId ?? suggestion.supplierId,
    supplierName: existing.supplierName ?? suggestion.supplierName,
    costPerUnit: existing.costPerUnit ?? suggestion.costPerUnit,
    leadTimeDays: existing.leadTimeDays ?? suggestion.leadTimeDays,
    productUnitId: existing.productUnitId ?? baseUnit?.id ?? null,
    unitName: existing.unitName ?? baseUnit?.name ?? 'sp',
    unitBase: existing.unitBase ?? unitBase,
    quantity:
      existing.quantity ??
      Math.max(1, Math.ceil(Number(suggestion.suggestedQty || 0) / unitBase)),
  };
}

/** Dòng gửi lên /import-orders/from-suggest — số lượng quy về đơn vị cơ bản. */
export function buildOrderLines(panelItems, overrides) {
  return panelItems.map((item) => {
    const ov = overrides[item.productId] || {};
    const cost = ov.costPerUnit ?? item.costPerUnit;
    const unitBase = Number(ov.unitBase ?? 1) || 1;
    const packQty = Number(ov.quantity ?? item.suggestedQty) || 0;
    const baseQty = Math.max(1, Math.round(packQty * unitBase));
    return {
      productId: item.productId,
      supplierId: Number(ov.supplierId ?? item.supplierId),
      quantity: baseQty,
      coverDays: Number(ov.coverDays ?? item.coverDays ?? 7),
      orderDate: resolveOrderDate(item, ov),
      ...(cost != null ? { costPerUnit: Number(cost) } : {}),
    };
  });
}

/** Danh sách NCC dạng ImportPanel cần (lựa chọn dự phòng khi gợi ý không có NCC). */
export function toSupplierFallback(list) {
  return (Array.isArray(list) ? list : []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    phoneNumber: s.phoneNumber || s.phone,
    contactPerson: s.contactPerson,
    leadTimeDays: s.leadTimeDays ?? 3,
    costPerUnit: null,
    cheapest: false,
  }));
}
