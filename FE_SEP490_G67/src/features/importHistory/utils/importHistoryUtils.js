import { IMPORT_HISTORY_PAGE_SIZE } from '../constants';

export function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

export function formatMoneyCompact(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatQty(qty, unit) {
  return `${Number(qty || 0).toLocaleString('vi-VN')} ${unit || ''}`.trim();
}

/** Unique products from history rows — for product search suggestions */
export function extractProductCatalog(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.productId)) {
      map.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        unitName: row.unitName,
      });
    }
  });
  return Array.from(map.values());
}

export function filterImportHistory(rows, { supplierKeyword, focusedProductId }) {
  let result = rows;

  if (focusedProductId != null) {
    result = result.filter((r) => r.productId === focusedProductId);
  }

  const kw = supplierKeyword?.trim().toLowerCase();
  if (kw) {
    result = result.filter(
      (r) =>
        r.supplierName.toLowerCase().includes(kw) ||
        r.orderCode.toLowerCase().includes(kw),
    );
  }

  return result;
}

export function searchProducts(catalog, keyword) {
  const kw = keyword?.trim().toLowerCase();
  if (!kw) return [];
  return catalog.filter(
    (p) =>
      p.productName.toLowerCase().includes(kw) ||
      p.sku.toLowerCase().includes(kw),
  );
}

export function buildProductSummary(rows) {
  if (!rows.length) {
    return {
      totalQty: 0,
      totalOrders: 0,
      totalCost: 0,
      lastImportedAt: null,
      avgUnitPrice: 0,
    };
  }

  const orderCodes = new Set(rows.map((r) => r.orderCode));
  const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const avgUnitPrice = Math.round(
    rows.reduce((s, r) => s + (r.unitPrice || 0), 0) / rows.length,
  );
  const lastImportedAt = rows
    .map((r) => r.importedAt)
    .sort()
    .at(-1);

  return {
    totalQty,
    totalOrders: orderCodes.size,
    totalCost,
    lastImportedAt,
    avgUnitPrice,
  };
}

export function paginateItems(items, page, pageSize = IMPORT_HISTORY_PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return {
    items: slice,
    page: safePage,
    totalPages,
    totalItems,
    startIndex: totalItems === 0 ? 0 : start + 1,
    endIndex: start + slice.length,
  };
}
