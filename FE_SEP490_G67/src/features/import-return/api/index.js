import { api } from '@/lib/api-clien';

export async function fetchImportReturns({
    status,
    statuses,
    source,
    q = '',
    days,
    from,
    to,
    page = 0,
    size = 8,
} = {}) {
    const response = await api.get('/import-returns', {
        params: {
            status: status || undefined,
            statuses: Array.isArray(statuses) ? statuses.join(',') : statuses || undefined,
            source: source || undefined,
            q: q || undefined,
            days: days || undefined,
            from: from || undefined,
            to: to || undefined,
            page,
            size,
        },
    });
    return response.result;
}

export async function fetchImportReturnById(id) {
    const response = await api.get(`/import-returns/${id}`);
    return response.result;
}

export async function createImportReturnDraft(payload) {
    const response = await api.post('/import-returns/drafts', payload);
    return response.result;
}

export async function updateImportReturnDraft(id, payload) {
    const response = await api.put(`/import-returns/drafts/${id}`, payload);
    return response.result;
}

export async function deleteImportReturnDraft(id) {
    const response = await api.delete(`/import-returns/drafts/${id}`);
    return response.result;
}

export async function deleteImportReturnDraftLine(returnId, detailId) {
    const response = await api.delete(`/import-returns/drafts/${returnId}/lines/${detailId}`);
    return response.result;
}

export async function submitImportReturn(id) {
    const response = await api.post(`/import-returns/${id}/submit`);
    return response.result;
}

export async function createAndSubmitImportReturn(payload) {
    const response = await api.post('/import-returns', payload);
    return response.result;
}

export async function updateImportReturnLineStatus(
    returnId,
    detailId,
    lineStatus,
    exchangeExpiryDate,
) {
    const payload = { lineStatus };
    if (exchangeExpiryDate !== undefined) {
        payload.exchangeExpiryDate = exchangeExpiryDate || null;
    }
    const response = await api.patch(`/import-returns/${returnId}/lines/${detailId}/status`, payload);
    return response.result;
}

export async function updateImportReturnExchangeExpiry(returnId, detailId, exchangeExpiryDate) {
    const response = await api.patch(`/import-returns/${returnId}/lines/${detailId}/exchange-expiry`, {
        exchangeExpiryDate: exchangeExpiryDate || null,
    });
    return response.result;
}

export async function createImportReturnDraftFromInventoryCheck({ inventoryCheckId, lines }) {
    const response = await api.post('/import-returns/draft/from-inventory-check', {
        inventoryCheckId,
        lines,
    });
    return response.result;
}

/** Compat — latest inventory-check draft for banner. */
export async function fetchImportReturnDraft({
    source = 'INVENTORY_CHECK',
    createIfMissing = false,
} = {}) {
    const response = await api.get('/import-returns/draft', {
        params: { source, createIfMissing },
    });
    return response.result;
}
