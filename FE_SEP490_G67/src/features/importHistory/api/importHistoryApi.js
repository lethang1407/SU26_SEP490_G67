import { api } from '@/lib/api-clien';

export const importHistoryApi = {
  getList: async ({
    from,
    to,
    supplierKeyword,
    productId,
    status,
    page = 0,
    size = 5,
  } = {}) => {
    const response = await api.get('/import-history', {
      params: {
        from: from || undefined,
        to: to || undefined,
        supplierKeyword: supplierKeyword || undefined,
        productId: productId || undefined,
        status: status || undefined,
        page,
        size,
      },
    });
    return (
      response.result || {
        content: [],
        page: 0,
        size,
        totalElements: 0,
        totalPages: 0,
      }
    );
  },

  getSummary: async ({ from, to, productId } = {}) => {
    const response = await api.get('/import-history/summary', {
      params: {
        from: from || undefined,
        to: to || undefined,
        productId: productId || undefined,
      },
    });
    return response.result;
  },
};
