import { api } from '@/lib/api-clien';

/**
 * Look up a product by its barcode.
 */
export async function getProductByBarcode(barcode) {
    const response = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.result;
}

/**
 * Search active products by name keyword(s) for the POS search bar.
 * Returns up to 20 matching products.
 */
export async function searchProductsByName(query) {
    const response = await api.get(`/products/search`, { params: { q: query } });
    return response.result ?? [];
}

/**
 * Look up a customer by phone number.
 * Returns the customer object if found, or null result if not.
 */
export async function getCustomerByPhone(phone) {
    const response = await api.get(`/customers/phone-lookup`, { params: { phone } });
    return response.result ?? null;
}

/**
 * Search customers by phone (or name) keyword for the POS customer dropdown.
 * Returns up to `size` matching customers.
 */
export async function searchCustomersByPhone(keyword, size = 8) {
    const response = await api.get(`/customers/debts`, { params: { keyword, page: 1, size } });
    return response.result?.content ?? [];
}

/**
 * Quick-create a new customer from the POS screen.
 * Sends { fullName, phoneNumber } to POST /customers.
 */
export async function createQuickCustomer(payload) {
    const response = await api.post('/customers', payload);
    return response.result;
}

/**
 * Create a standard invoice (customer exists).
 */
export async function createInvoice(payload) {
    const response = await api.post('/sales-orders', payload);
    return response.result;
}

/**
 * Create a debt invoice (customer not found / anonymous).
 */
export async function createDebtInvoice(payload) {
    const response = await api.post('/sales-orders/debt', payload);
    return response.result;
}

/**
 * Fetch the receipt data for a completed invoice.
 */
export async function getReceipt(invoiceId) {
    const response = await api.get(`/sales-orders/${invoiceId}/receipt`);
    return response.result;
}

/**
 * Fetch the full invoice JSON for browser-side printing.
 * Authenticated endpoint — JWT is automatically attached by the api interceptor.
 */
export async function getInvoiceData(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/invoice`);
    return response.result;
}

/**
 * Fetch paginated sales order history for the POS History Modal.
 * @param {object} params - { page, size, search, dateFrom, dateTo }
 */
export async function getSalesOrderHistory(params = {}) {
    const response = await api.get('/sales-orders', { params });
    return response.result;
}

/**
 * Get order details for exchange order page
 */
export async function getOrderForExchange(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/exchange`);
    return response.result;
}

/**
 * Process exchange order
 */
export async function processExchangeOrder(payload) {
    const response = await api.post('/sales-orders/exchange', payload);
    return response.result;
}
