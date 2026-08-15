import { api } from '@/lib/api-clien';

export const importOrdersApi = {
    getImportOrders: async ({
        page = 0,
        size = 10,
        search = '',
        orderStatus = 'ALL',
        fromDate = '',
        toDate = '',
    } = {}) => {
        const params = { page, size, orderStatus };
        if (search && search.trim()) params.search = search.trim();
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        const response = await api.get('/import-orders', { params });
        return response.result;
    },

    createImportOrder: async (payload) => {
        const response = await api.post('/import-orders', payload);
        return response.result;
    },

    getImportOrderDetail: async (id) => {
        const response = await api.get(`/import-orders/${id}`);
        return response.result;
    },

    getImportOrderPayments: async (id, { page = 0, size = 10 } = {}) => {
        const response = await api.get(`/import-orders/${id}/payments`, {
            params: { page, size },
        });
        return response.result;
    },

    updateImportOrder: async (id, payload) => {
        const response = await api.put(`/import-orders/${id}`, payload);
        return response.result;
    },

    getPendingSupplierReturns: async (supplierId, importOrderId) => {
        const params = { supplierId };
        if (importOrderId) params.importOrderId = importOrderId;
        const response = await api.get('/import-orders/pending-returns', { params });
        return response.result ?? [];
    },

    cancelDraftImportOrder: async (id) => {
        const response = await api.delete(`/import-orders/${id}`);
        return response;
    },

    /** Tìm SP theo tên / barcode — dùng chung endpoint POS. */
    searchProducts: async (query) => {
        const response = await api.get('/products/search', { params: { q: query } });
        return response.result ?? [];
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
