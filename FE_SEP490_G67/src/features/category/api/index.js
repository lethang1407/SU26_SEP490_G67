import { api } from '@/lib/api-clien';

export const categoriesApi = {
  getPage: async ({ search, page = 0, size = 10 } = {}) => {
    const response = await api.get('/category', {
      params: {
        search: search || undefined,
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

  getAllCategories: async () => {
    const result = await categoriesApi.getPage({ page: 0, size: 200 });
    return result.content || [];
  },

  create: async (payload) => {
    const response = await api.post('/category', payload);
    return response.result;
  },

  update: async (id, payload) => {
    const response = await api.put(`/category/${id}`, payload);
    return response.result;
  },
};
