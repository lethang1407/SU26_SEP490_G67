import { api } from '@/lib/api-clien';

/**
 * Look up a product by its barcode.
 */
export async function getProductByBarcode(barcode) {
    const response = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.result;
}

/**
 * Look up a customer by phone number.
 */
export async function getCustomerByPhone(phone) {
    const response = await api.get(`/customers`, { params: { phone } });
    return response.result ?? null;
}

/**
 * Create a standard invoice (customer exists).
 */
export async function createInvoice(payload) {
    const response = await api.post('/invoices', payload);
    return response.result;
}

/**
 * Create a debt invoice (customer not found / anonymous).
 */
export async function createDebtInvoice(payload) {
    const response = await api.post('/invoices/debt', payload);
    return response.result;
}

/**
 * Fetch the receipt data for a completed invoice.
 */
export async function getReceipt(invoiceId) {
    const response = await api.get(`/invoices/${invoiceId}/receipt`);
    return response.result;
}
