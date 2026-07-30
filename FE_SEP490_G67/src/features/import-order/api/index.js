import { api } from '@/lib/api-clien';

export const importOrdersApi = {
    getImportOrders: async ({ page = 0, size = 10, search = '', orderStatus = 'ALL' } = {}) => {
        const params = { page, size, orderStatus };
        if (search && search.trim()) params.search = search.trim();
        const response = await api.get('/import-orders', { params });
        return response.result;
    },
};

export async function fetchImportOrders({
    page = 0,
    size = 10,
    search = '',
    status = 'ALL',
} = {}) {
    const params = { page, size, status };
    if (search?.trim()) {
        params.search = search.trim();
    }
    const response = await api.get('/import-orders', { params });
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

export async function fetchImportOrderById(orderId) {
    const response = await api.get(`/import-orders/${orderId}`);
    return response.result;
}

export async function createImportOrder(payload) {
    const response = await api.post('/import-orders', payload);
    return response.result;
}
