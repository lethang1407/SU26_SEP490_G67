import { api } from '@/lib/api-clien';

/**
 * Paginated sales order list for admin Orders page.
 * @param {object} params
 */
export async function getSalesOrders(params = {}) {
    const cleaned = { ...params };
    Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === undefined || cleaned[key] === '' || cleaned[key] === 'ALL') {
            delete cleaned[key];
        }
    });
    const response = await api.get('/sales-orders', { params: cleaned });
    return response.result;
}

/**
 * Sales order detail for admin view.
 */
export async function getSalesOrderDetail(orderId) {
    const response = await api.get(`/sales-orders/${orderId}`);
    return response.result;
}

/**
 * Invoice payload for browser print (existing POS endpoint).
 */
export async function getInvoiceData(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/invoice`);
    return response.result;
}

/**
 * Get daily reconciliation summary for a given date from existing SalesOrder & DebtPayment entities.
 */
export async function getReconciliationSummary(dateStr, openingCash) {
    const params = {};
    if (dateStr) params.date = dateStr;
    if (openingCash !== undefined && openingCash !== null && openingCash !== '') {
        params.openingCash = openingCash;
    }
    const response = await api.get('/reconciliations/summary', { params });
    return response;
}

/**
 * Submit / Close day reconciliation.
 */
export async function submitReconciliation(data) {
    const response = await api.post('/reconciliations', data);
    return response;
}
