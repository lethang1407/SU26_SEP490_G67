import { api } from '@/lib/api-clien';

export async function getNotifications(params = { page: 1, size: 10 }) {
    const response = await api.get('/notifications', { params });
    return response.result ?? { content: [], totalElements: 0 };
}

export async function getUnreadNotificationCount() {
    const response = await api.get('/notifications/unread-count');
    return response.result ?? 0;
}

export async function markNotificationRead(id) {
    return api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
    return api.put('/notifications/read-all');
}
