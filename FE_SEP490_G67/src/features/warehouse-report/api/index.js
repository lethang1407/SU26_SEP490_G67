import { api } from '@/lib/api-clien';
import { downloadBlob } from '@/features/product/api';

export const MOVEMENT_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'IMPORT', label: 'Nhập hàng' },
  { value: 'SALE', label: 'Bán' },
  { value: 'EXCHANGE_RETURN', label: 'Đổi / Trả khách' },
  { value: 'SUPPLIER_RETURN', label: 'Trả NCC' },
  { value: 'CANCEL', label: 'Hủy hàng' },
];

export const warehouseReportApi = {
  getInventoryIo: async ({
    from,
    to,
    productIds = [],
    types = [],
    page = 0,
    size = 15,
  } = {}) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    (productIds || []).forEach((id) => params.append('productIds', String(id)));
    (types || []).forEach((t) => params.append('types', t));
    const response = await api.get(`/warehouse-report/inventory-io?${params.toString()}`);
    return response.result;
  },

  exportInventoryIo: async ({ from, to, productIds = [], types = [] } = {}) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    (productIds || []).forEach((id) => params.append('productIds', String(id)));
    (types || []).forEach((t) => params.append('types', t));
    const qs = params.toString();
    const blob = await api.get(
      `/warehouse-report/inventory-io/export${qs ? `?${qs}` : ''}`,
      { responseType: 'blob' },
    );
    return blob;
  },

  searchProducts: async (q) => {
    const trimmed = (q || '').trim();
    if (!trimmed) {
      return warehouseReportApi.listProducts();
    }
    const response = await api.get('/products/search', { params: { q: trimmed } });
    return (response.result ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      sellingPrice: p.sellingPrice,
      stockQuantity: p.stockQuantity,
      productUnits: p.productUnits || [],
    }));
  },

  listProducts: async ({ page = 0, size = 50, keyword = '' } = {}) => {
    const response = await api.get('/products', {
      params: {
        page,
        size,
        keyword: keyword || undefined,
      },
    });
    const content = response.result?.content ?? [];
    return content.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.code || p.sku,
      barcode: p.barcode,
      sellingPrice: p.sellPrice ?? p.sellingPrice,
      stockQuantity: p.stock ?? p.onHand ?? 0,
      productUnits: p.unitName
        ? [{ name: p.unitName, unitBase: 1 }]
        : [],
    }));
  },
};

export function downloadWarehouseReport(blob, filename) {
  downloadBlob(blob, filename);
}
