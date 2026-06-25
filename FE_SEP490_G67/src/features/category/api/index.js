import { api } from '@/lib/api-clien';

export const categoriesApi = {
        getAllCategories: async () => {
        const response = await api.get("/category");
        console.log('API response for getAllCategories:', response);
        return response.result?.content || [];
    }
}
