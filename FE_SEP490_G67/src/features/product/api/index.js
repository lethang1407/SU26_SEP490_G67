import { api } from '@/lib/api-clien';
import { resolveProductImageUrl } from '../utils/productImageUtils';

export { resolveProductImageUrl };

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
    const response = await api.get(`/products/${productId}`);
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

export async function uploadProductImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/products/image', formData);
    return response.result?.url ?? null;
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

    const importPrice = Number(detail.importPrice) || 0;
    const sellPrice = Number(detail.sellPrice) || 0;
    const stock = Number(detail.stock) || 0;
    const unitName = detail.baseUnit?.name ?? 'Cái';

    return {
        ...detail,
        importPrice,
        sellPrice,
        stock,
        unit: unitName,
        brand: findAttributeValue(detail.attributes, ['Thương hiệu', 'Brand']) ?? '—',
        weight: findAttributeValue(detail.attributes, ['Trọng lượng', 'Weight']) ?? '—',
        minStock: Number(detail.minStock) || 0,
        lastUpdated: '—',
        supplier: detail.supplier ?? '',
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
        productImg: detail.productImg ?? null,
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
        productImg: formData.productImg || undefined,
        attributes,
    };
}

export function buildUpdatePayload(formData) {
    return {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        importPrice: formData.importPrice,
        sellPrice: formData.sellPrice,
        businessStatus: formData.businessStatus,
        baseUnit: formData.baseUnit,
        conversionUnits: formData.conversionUnits,
        productImg: formData.productImg,
    };
}
