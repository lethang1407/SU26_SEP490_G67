import { api } from '@/lib/api-clien';

/** Thẻ "Kho hàng" trên dashboard: 3 nhóm việc kèm mức độ nghiêm trọng đã tính ở BE. */
export async function getInventoryAttention() {
    const response = await api.get('/inventory-attention');
    return response.result;
}

/** Danh sách lô hết hạn đằng sau lằn "Hàng hết hạn". */
export async function getExpiredBatches() {
    const response = await api.get('/inventory-attention/expired-batches');
    return response.result ?? [];
}

/**
 * Widget "Sản phẩm cần quyết định nhập hàng".
 *
 * BE đã chuẩn hoá đơn vị, phân loại và xếp hạng sẵn — FE chỉ hiển thị, không tự
 * tính lại ngưỡng nào.
 */
export async function getRestockAdvice({ limit, windowDays } = {}) {
    const response = await api.get('/inventory-attention/restock-advice', {
        params: {
            limit: limit || undefined,
            windowDays: windowDays || undefined,
        },
    });
    return response.result ?? null;
}

/**
 * "Bỏ qua" một sản phẩm trong widget: ẩn khỏi dashboard tới hết ngày hôm nay.
 *
 * BE lưu lại là chủ cửa hàng đã xem và bỏ qua; sang ngày mới nó đánh giá lại và
 * sản phẩm có thể xuất hiện trở lại nếu vấn đề vẫn còn.
 */
export async function dismissRestockAdvice(productId) {
    await api.post(`/inventory-attention/restock-advice/${productId}/dismiss`);
}
