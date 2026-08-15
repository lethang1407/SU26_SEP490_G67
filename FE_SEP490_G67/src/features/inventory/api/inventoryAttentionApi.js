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
