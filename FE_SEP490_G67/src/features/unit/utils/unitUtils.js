import { COMMON_UNITS, UNIT_SORT } from '../constants/unitConstants';

const CUSTOM_UNITS_STORAGE_KEY = 'store_custom_unit_names_v1';

export function getCustomUnitNames() {
  try {
    const raw = localStorage.getItem(CUSTOM_UNITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomUnitNames(names) {
  try {
    localStorage.setItem(CUSTOM_UNITS_STORAGE_KEY, JSON.stringify(names));
  } catch (err) {
    console.error('Failed to save custom unit names', err);
  }
}

/**
 * Lấy danh sách toàn bộ đơn vị tính từ:
 * 1. Danh mục phổ biến (COMMON_UNITS)
 * 2. Đơn vị người dùng thêm mới (Custom Unit Names)
 * 3. Quét toàn bộ đơn vị thực tế trong các sản phẩm (Product.units: { id, name, unitBase, sellingPrice })
 */
export function aggregateUnitsFromProducts(products = []) {
  const unitMap = new Map();

  // Khởi tạo từ danh sách phổ biến & tùy chỉnh
  const initialNames = [...new Set([...COMMON_UNITS, ...getCustomUnitNames()])];
  initialNames.forEach((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    unitMap.set(trimmed.toLowerCase(), {
      name: trimmed,
      baseCount: 0,
      convCount: 0,
      totalCount: 0,
      isSystem: COMMON_UNITS.some((u) => u.toLowerCase() === trimmed.toLowerCase()),
      products: [],
    });
  });

  // Quét danh sách sản phẩm để đếm và thu thập đúng theo ProductUnit entity
  products.forEach((p) => {
    if (!p) return;

    const units = Array.isArray(p.units) ? p.units : [];
    const baseUnitObj = units.find((u) => u.isBase || Number(u.unitBase) === 1);
    const baseName = baseUnitObj?.name || p.unitName || p.baseUnitName || 'Cái';

    // 1. Đơn vị gốc của sản phẩm (unitBase = 1)
    const baseKey = baseName.trim().toLowerCase();
    if (!unitMap.has(baseKey)) {
      unitMap.set(baseKey, {
        name: baseName.trim(),
        baseCount: 0,
        convCount: 0,
        totalCount: 0,
        isSystem: false,
        products: [],
      });
    }

    const baseEntry = unitMap.get(baseKey);
    baseEntry.baseCount += 1;
    baseEntry.totalCount += 1;
    baseEntry.products.push({
      id: p.id,
      name: p.name,
      sku: p.sku || `SP${p.id}`,
      categoryName: p.categoryName || p.category || '—',
      role: 'base',
      unitBase: 1,
      baseUnitName: baseName,
      sellingPrice: p.sellingPrice || p.sellPrice || 0,
    });

    // 2. Các đơn vị quy đổi của sản phẩm (unitBase != 1)
    units.forEach((u) => {
      if (u === baseUnitObj || Number(u.unitBase) === 1 || u.isBase) return;
      const convName = (u.name || '').trim();
      if (!convName) return;

      const convKey = convName.toLowerCase();
      if (!unitMap.has(convKey)) {
        unitMap.set(convKey, {
          name: convName,
          baseCount: 0,
          convCount: 0,
          totalCount: 0,
          isSystem: false,
          products: [],
        });
      }

      const convEntry = unitMap.get(convKey);
      convEntry.convCount += 1;
      convEntry.totalCount += 1;
      convEntry.products.push({
        id: p.id,
        name: p.name,
        sku: p.sku || `SP${p.id}`,
        categoryName: p.categoryName || p.category || '—',
        role: 'conversion',
        unitBase: Number(u.unitBase) || 1,
        baseUnitName: baseName,
        sellingPrice: Number(u.sellingPrice) || 0,
      });
    });
  });

  return Array.from(unitMap.values());
}

export function filterAndSortUnits(units, { keyword = '', sort = UNIT_SORT.NAME_ASC } = {}) {
  let result = [...units];

  if (keyword && keyword.trim()) {
    const q = keyword.trim().toLowerCase();
    result = result.filter((u) => u.name.toLowerCase().includes(q));
  }

  result.sort((a, b) => {
    switch (sort) {
      case UNIT_SORT.NAME_DESC:
        return b.name.localeCompare(a.name, 'vi');
      case UNIT_SORT.USAGE_DESC:
        return (b.totalCount || 0) - (a.totalCount || 0);
      case UNIT_SORT.NAME_ASC:
      default:
        return a.name.localeCompare(b.name, 'vi');
    }
  });

  return result;
}
