import { api } from '@/lib/api-clien';

export const importOrderApi = {
  getSuggestions: async (productIds, coverOverrides = {}) => {
    const response = await api.post('/import-orders/suggest', {
      productIds,
      coverOverrides,
    });
    return response.result || [];
  },

  createOrders: async (lines) => {
    const response = await api.post('/import-orders', { lines });
    return response.result || [];
  },
};
