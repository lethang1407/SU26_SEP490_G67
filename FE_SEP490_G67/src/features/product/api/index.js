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

  exportExcel: async ({ facet = 'hot', categoryId, keyword } = {}) => {
    const blob = await api.get('/products/export-excel', {
      params: {
        facet,
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
      },
      responseType: 'blob',
    });
    return blob;
  },

  downloadImportTemplate: async () => {
    const blob = await api.get('/products/import-excel-template', {
      responseType: 'blob',
    });
    return blob;
  },

  importExcel: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/products/import-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.result;
  },
};

export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) return;
  // API lỗi đôi khi trả JSON dưới dạng blob
  if (blob.type && blob.type.includes('application/json')) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
