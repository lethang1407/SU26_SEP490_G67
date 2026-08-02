import { api } from '@/lib/api-clien';

export const productsApi = {
  getProducts: async ({ facet = 'hot', categoryId, keyword, page = 0, size = 10 } = {}) => {
    const response = await api.get('/products', {
      params: {
        facet,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        page,
        size,
      },
    });
    return response.result || { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.result;
  },

  create: async (payload) => {
    const response = await api.post('/products', payload);
    return response.result;
  },

  update: async (id, payload) => {
    const response = await api.put(`/products/${id}`, payload);
    return response.result;
  },

  uploadImage: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.result;
  },

  deleteImage: async (id, imageId) => {
    const response = await api.delete(`/products/${id}/images/${imageId}`);
    return response;
  },
};
