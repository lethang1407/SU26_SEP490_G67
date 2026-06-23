import { api } from '@/lib/api-clien';
const suppliers = {
    addSupplier: async (payload) => {
        const response = await api.post("/suppliers", payload);
        return response;
    }
}
export default suppliers;