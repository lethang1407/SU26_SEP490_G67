import { api } from '@/lib/api-clien';

export async function fetchInventoryChecks({
    page = 0,
    size = 10,
    search = '',
    status = 'all',
} = {}) {
    const params = { page, size, status };
    if (search?.trim()) {
        params.search = search.trim();
    }
    const response = await api.get('/inventory-checks', { params });
    return (
        response.result ?? {
            content: [],
            page: 0,
            size,
            totalElements: 0,
            totalPages: 1,
        }
    );
}

export async function fetchInventoryCheckById(id) {
    const response = await api.get(`/inventory-checks/${id}`);
    return response.result;
}

export async function fetchInventoryCheckProductPreview(productId) {
    const response = await api.get(`/inventory-checks/product-preview/${productId}`);
    return response.result;
}

export async function fetchInventoryCheckAttention() {
    const response = await api.get('/inventory-checks/attention');
    return response.result ?? [];
}

/** Tìm SP theo tên / barcode — dùng chung endpoint POS. */
export async function searchProductsForCheck(query) {
    const response = await api.get('/products/search', { params: { q: query } });
    return response.result ?? [];
}

export async function createInventoryCheck(payload) {
    const response = await api.post('/inventory-checks', payload);
    return response.result;
}

export async function cancelStockBatch(batchId, quantity) {
    const response = await api.post(`/stock-batches/${batchId}/cancel`, { quantity });
    return response.result;
}
