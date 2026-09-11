import { api } from '@/lib/api-clien';

/**
 * Hộp thông báo của người đang đăng nhập.
 *
 * @param {object} params `page` (đếm từ 1), `size`, và các bộ lọc không bắt buộc:
 *        `types` (mảng — nhiều loại là quan hệ HOẶC), `isRead`, `from`/`to` (yyyy-MM-dd).
 */
export async function getNotifications({ page = 1, size = 10, types, isRead, from, to } = {}) {
    const params = { page, size };
    if (types?.length) params.type = types;
    if (isRead !== null && isRead !== undefined) params.isRead = isRead;
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await api.get('/notifications', {
        params,
        // Backend nhận `?type=A&type=B`. Mặc định axios sẽ ra `type[]=A&type[]=B`,
        // Spring không bind được thành List và bộ lọc loại sẽ im lặng biến mất.
        paramsSerializer: { indexes: null },
    });
    return response.result ?? { content: [], totalElements: 0, totalPages: 0, page: 1 };
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
