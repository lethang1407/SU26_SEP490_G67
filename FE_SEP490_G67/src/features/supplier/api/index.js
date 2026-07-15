import { api } from '@/lib/api-clien';

export const suppliersApi = {
    getSuppliers: async ({ page = 0, size = 10, search = '', debtFilter = 'ALL' } = {}) => {
        const params = { page, size, debtFilter };
        if (search && search.trim()) params.search = search.trim();
        const response = await api.get('/suppliers', { params });
        return response.result;
    },

    addSupplier: async (payload) => {
        const response = await api.post('/suppliers', payload);
        return response;
    },

    getSupplierById: async (id) => {
        const response = await api.get(`/suppliers/${id}`);
        return response.result;
    },

    getImportOrders: async (supplierId, { page = 0, size = 5, search = '', status = 'ALL' } = {}) => {
        const params = { page, size, status };
        if (search && search.trim()) params.search = search.trim();
        const response = await api.get(`/suppliers/${supplierId}/import-orders`, { params });
        return response.result;
    },

    getImportOrderDetail: async (orderId) => {
        const response = await api.get(`/import-orders/${orderId}`);
        return response.result;
    },

    createPayment: async (supplierId, { orderId, amount, paymentMethod, note }) => {
        const response = await api.post(`/suppliers/${supplierId}/payments`, {
            orderId,
            amount,
            paymentMethod,
            note,
        });
        return response.result;
    },

    getPaymentHistory: async (supplierId, { page = 0, size = 5, search = '', fromDate = '', toDate = '' } = {}) => {
        const params = { page, size };
        if (search && search.trim()) params.search = search.trim();
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        const response = await api.get(`/suppliers/${supplierId}/payments`, { params });
        return response.result;
    },
};
