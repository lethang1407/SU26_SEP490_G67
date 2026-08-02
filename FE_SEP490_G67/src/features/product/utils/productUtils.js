import { MOCK_PRODUCTS_BY_FACET, PAGE_SIZE } from '../constants';

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
  if (days < 1) return '<1 ngày';
  if (days >= 28) return `~${Math.round(days / 30)} tháng`;
  if (days >= 7 && days % 7 === 0) return `~${days / 7} tuần`;
  return `~${Math.round(days * 10) / 10} ngày`;
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
    const lineTotal = (item.costPerUnit || 0) * (item.suggestedQty || 0);
    group.lines.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.suggestedQty,
      costPerUnit: item.costPerUnit || 0,
      lineTotal,
    });
    group.total += lineTotal;
    if (item.orderToday) group.urgent = true;
  }
  return Array.from(map.values());
}
