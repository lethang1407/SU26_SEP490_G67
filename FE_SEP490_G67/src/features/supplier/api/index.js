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
};
