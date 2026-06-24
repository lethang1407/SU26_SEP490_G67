import { api } from '@/lib/api-clien';

export const suppliersApi = {
    addSupplier: async (payload) => {
        const response = await api.post("/suppliers", payload);
        return response;
    },
}

