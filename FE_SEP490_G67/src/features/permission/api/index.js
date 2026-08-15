import { api } from '@/lib/api-clien';

export async function getAllPermissions() {
    const response = await api.get('/permissions');
    return response.result;
}

export async function getUserPermissions(userId) {
    const response = await api.get(`/permissions/users/${userId}`);
    return response.result;
}

export async function updateUserPermissions(userId, permissionCodes) {
    const response = await api.put(`/permissions/users/${userId}`, { permissionCodes });
    return response.result;
}

export async function getApiEndpointRules() {
    const response = await api.get('/permissions/api-endpoints');
    return response.result;
}

export async function saveApiEndpointRule(rule) {
    if (rule.id) {
        const response = await api.put(`/permissions/api-endpoints/${rule.id}`, rule);
        return response.result;
    } else {
        const response = await api.post('/permissions/api-endpoints', rule);
        return response.result;
    }
}

export async function deleteApiEndpointRule(id) {
    const response = await api.delete(`/permissions/api-endpoints/${id}`);
    return response.result;
}
