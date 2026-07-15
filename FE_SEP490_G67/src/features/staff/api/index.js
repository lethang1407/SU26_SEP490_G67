import { api } from '@/lib/api-clien';

export async function getStaffList(params = {}) {
    const response = await api.get('/staff', { params });
    return response.result ?? [];
}

export async function getStaffById(staffId) {
    const response = await api.get(`/staff/${staffId}`);
    return response.result;
}

export async function createStaff(payload) {
    const response = await api.post('/staff', payload);
    return response;
}

export async function updateStaff(staffId, payload) {
    const response = await api.put(`/staff/${staffId}`, payload);
    return response;
}
