import { api } from '@/lib/api-clien';

export const importOrdersApi = {
    getImportOrders: async ({ page = 0, size = 10, search = '', orderStatus = 'ALL' } = {}) => {
        const params = { page, size, orderStatus };
        if (search && search.trim()) params.search = search.trim();
        const response = await api.get('/import-orders', { params });
        return response.result;
    },
};
