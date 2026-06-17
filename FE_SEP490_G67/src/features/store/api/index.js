import { api } from '@/lib/api-clien';

export async function getStoreInfor() {
    const response = await api.get('/store');
    return response.result;
}

export async function updateStoreInfor(data) {
    const response = await api.put('/store', data);
    return response;
}