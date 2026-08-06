import {
  CATEGORY_FILTER,
  STATUS_FILTER,
  SUPPLIER_FILTER,
  MOCK_PRODUCTS_BY_FACET,
  PAGE_SIZE,
} from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

export function filterProducts(products, { keyword, categoryFilter, statusFilter, supplierFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products.filter((product) => {
        const matchesKeyword =
            !normalizedKeyword ||
            product.name.toLowerCase().includes(normalizedKeyword) ||
            product.code.toLowerCase().includes(normalizedKeyword) ||
            product.barcode.includes(normalizedKeyword);

        const matchesCategory =
            categoryFilter === CATEGORY_FILTER.ALL || product.category === categoryFilter;

        const productStatus =
            product.stock > 0 ? STATUS_FILTER.IN_STOCK : STATUS_FILTER.OUT_OF_STOCK;
        const matchesStatus =
            statusFilter === STATUS_FILTER.ALL || productStatus === statusFilter;

        const matchesSupplier =
            supplierFilter === SUPPLIER_FILTER.ALL || product.supplier === supplierFilter;

        return matchesKeyword && matchesCategory && matchesStatus && matchesSupplier;
    });
}

export function paginateItems(items, page, pageSize) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
        items: items.slice(startIndex, endIndex),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        startIndex: totalItems === 0 ? 0 : startIndex + 1,
        endIndex,
    };
}

export function formatRate(value, unit) {
  if (value == null) return '—';
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `~${text} ${unit || 'sp'}`;
}

export function formatCoverDays(days) {
  if (days == null) return '—';
  if (days <= 0) return '0 ngày';
  if (days >= 999) return '—';
  // Làm tròn xuống số nguyên — dễ kiểm soát hơn số thập phân
  const whole = Math.floor(Number(days));
  if (whole < 1) return '<1 ngày';
  if (whole >= 28) return `~${Math.floor(whole / 30)} tháng`;
  if (whole >= 7 && whole % 7 === 0) return `~${whole / 7} tuần`;
  return `${whole} ngày`;
}

export function stockClass(onHand, facet) {
  if (onHand <= 0) return facet === 'slow' || facet === 'stop' ? 'stock muted' : 'stock';
  if (facet === 'warn') return 'stock warn';
  return 'stock ok';
}

export function coverClass(days) {
  if (days == null || days <= 0) return 'cover zero';
  if (days <= 3) return 'cover low';
  return 'cover ok';
}

export function rowClass(facet, checked) {
  const map = {
    hot: 'out-row',
    slow: 'slow-row',
    warn: 'warn-row',
    season: 'season-row',
    stop: 'slow-row',
  };
  return `${map[facet] || ''} ${checked ? 'checked-row' : ''}`.trim();
}

export function paginateLocal(items, page, size = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * size;
  return {
    content: items.slice(start, start + size),
    page: safePage,
    size,
    totalElements: total,
    totalPages,
  };
}

export function getMockProducts(facet) {
  return MOCK_PRODUCTS_BY_FACET[facet] || MOCK_PRODUCTS_BY_FACET.hot;
}

export function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

/** Cover cascade display: PANEL > PRODUCT > CATEGORY > STORE */
export function resolveCoverSourceLabel(source, categoryName) {
  switch (source) {
    case 'PANEL':
      return 'Lần nhập này';
    case 'PRODUCT':
      return 'Cài riêng SP';
    case 'CATEGORY':
      return categoryName ? `Nhóm ${categoryName}` : 'Theo nhóm';
    case 'STORE':
      return 'Mặc định cửa hàng';
    default:
      return '—';
  }
}

export function groupSuggestionsBySupplier(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.supplierId ?? item.supplierName ?? 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        supplierId: item.supplierId,
        supplierName: item.supplierName || 'Chưa chọn NCC',
        urgent: Boolean(item.orderToday),
        lines: [],
        total: 0,
      });
    }
    const group = map.get(key);
    const qty = item.quantity ?? item.suggestedQty ?? 0;
    const lineTotal =
      item.lineTotal != null
        ? Number(item.lineTotal)
        : (item.costPerUnit || 0) * qty;
    group.lines.push({
      productId: item.productId,
      productName: item.productName,
      quantity: qty,
      packQty: item.packQty,
      unitName: item.unitName,
      unitBase: item.unitBase,
      costPerUnit: item.costPerUnit || 0,
      lineTotal,
    });
    group.total += lineTotal;
    if (item.orderToday) group.urgent = true;
  }
  return Array.from(map.values());
}
