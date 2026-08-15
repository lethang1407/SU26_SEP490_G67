import { api } from '@/lib/api-clien';

export const productsApi = {
  getProducts: async ({ facet = 'hot', categoryId, keyword, page = 0, size = 10 } = {}) => {
    const response = await api.get('/import/suggestions', {
      params: {
        status: facet,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        page,
        size,
      },
    });
    return response.result || { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.result;
  },

  create: async (payload) => {
    const response = await api.post('/products', payload);
    return response.result;
  },

  update: async (id, payload) => {
    const response = await api.put(`/products/${id}`, payload);
    return response.result;
  },

  uploadImage: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.result;
  },

  deleteImage: async (id, imageId) => {
    const response = await api.delete(`/products/${id}/images/${imageId}`);
    return response;
  },

  exportExcel: async ({ facet = 'hot', categoryId, keyword } = {}) => {
    const blob = await api.get('/products/export-excel', {
      params: {
        facet,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
      },
      responseType: 'blob',
    });
    return blob;
  },

  downloadImportTemplate: async () => {
    const blob = await api.get('/products/import-excel-template', {
      responseType: 'blob',
    });
    return blob;
  },

  importExcel: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/products/import-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.result;
  },

  getPriceHistory: async (id) => {
    const response = await api.get(`/products/${id}/price-history`);
    return response.result;
  },
};

export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) return;
  // API lỗi đôi khi trả JSON dưới dạng blob
  if (blob.type && blob.type.includes('application/json')) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export async function getProductList(params = {}) {
    const response = await api.get('/products', { params });
    return (
        response.result ?? {
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 1,
        }
    );
}

export async function getProductById(productId) {
    const response = await api.get(`/products/${productId}/legacy-detail`);
    return response.result;
}

export async function createProduct(payload) {
    const response = await api.post('/products', payload);
    return response;
}

export async function updateProduct(productId, payload) {
    const response = await api.put(`/products/${productId}`, payload);
    return response;
}

function findAttributeValue(attributes, names) {
    if (!Array.isArray(attributes)) {
        return null;
    }

    const normalizedNames = names.map((name) => name.toLowerCase());
    const match = attributes.find((item) =>
        normalizedNames.includes(item.name?.toLowerCase?.() ?? ''),
    );

    return match?.value ?? null;
}

export function mapProductDetailView(detail) {
    if (!detail) {
        return null;
    }

    const importPrice = Number(detail.importPrice ?? detail.costPrice) || 0;
    const sellPrice = Number(detail.sellPrice ?? detail.sellingPrice) || 0;
    const stock = Number(detail.stock ?? detail.onHand) || 0;
    const unitName = detail.baseUnit?.name ?? detail.baseUnitName ?? detail.unit ?? 'Cái';

    const attributes = Array.isArray(detail.attributes) ? detail.attributes : [];

    let conversionUnits = [];
    if (Array.isArray(detail.conversionUnits) && detail.conversionUnits.length > 0) {
        conversionUnits = detail.conversionUnits;
    } else if (Array.isArray(detail.units) && detail.units.length > 0) {
        conversionUnits = detail.units
            .filter((u) => !u.isBase && (u.unitBase > 1 || u.ratio > 1))
            .map((u) => ({
                id: u.id,
                unitName: u.name || u.unitName,
                qty: u.unitBase || u.ratio || u.qty,
                ofUnit: u.ofUnit || unitName,
                sellPrice: u.sellingPrice || u.sellPrice,
            }));
    }

    return {
        ...detail,
        parentId: detail.parentId ?? null,
        parentName: detail.parentName ?? null,
        importPrice,
        sellPrice,
        stock,
        unit: unitName,
        attributes,
        conversionUnits,
        brand: findAttributeValue(attributes, ['Thương hiệu', 'Brand']) ?? detail.brand ?? '—',
        weight: findAttributeValue(attributes, ['Trọng lượng', 'Weight']) ?? detail.weight ?? '—',
        minStock: Number(detail.minStock) || 0,
        lastUpdated: detail.lastUpdated ?? '—',
        supplier: detail.supplier ?? detail.supplierName ?? '',
        profitMargin:
            sellPrice > 0 ? (((sellPrice - importPrice) / sellPrice) * 100).toFixed(1) : '0.0',
        inventoryValue: stock * importPrice,
    };
}

export function mapProductEditView(detail) {
    const mapped = mapProductDetailView(detail);
    if (!mapped) {
        return null;
    }

    return {
        ...mapped,
        baseUnit: detail.baseUnit ?? { name: 'Cái', sellPrice: mapped.sellPrice },
        conversionUnits: detail.conversionUnits ?? [],
        businessStatus: detail.businessStatus ?? (mapped.stock > 0 ? 'active' : 'inactive'),
    };
}

export function buildCreatePayload(formData) {
    const attributes = (formData.attributes ?? [])
        .filter((item) => item.name?.trim() || item.value?.trim())
        .map((item) => ({
            name: item.name,
            value: item.value,
        }));

    if (formData.brand?.trim()) {
        attributes.unshift({
            name: 'Thương hiệu',
            value: formData.brand.trim(),
        });
    }

    return {
        name: formData.name,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        category: formData.category,
        brand: formData.brand || undefined,
        description: formData.description || undefined,
        importPrice: String(formData.importPrice),
        sellPrice: String(formData.sellPrice),
        vat: formData.vat || undefined,
        isActive: formData.isActive,
        attributes,
    };
}

export function buildUpdatePayload(formData) {
    return {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        brand: formData.brand ?? '',
        importPrice: formData.importPrice,
        sellPrice: formData.sellPrice,
        businessStatus: formData.businessStatus,
        baseUnit: formData.baseUnit,
        conversionUnits: formData.conversionUnits,
    };
}
