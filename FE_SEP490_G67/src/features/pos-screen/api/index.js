import { api } from '@/lib/api-clien';

export async function getProductByBarcode(barcode) {
    const response = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.result;
}

export async function searchProductsByName(query) {
    const response = await api.get(`/products/search`, { params: { q: query } });
    return response.result ?? [];
}

export async function getProductPosInfo(productId) {
    const response = await api.get(`/products/${productId}/pos-info`);
    return response.result;
}

export async function getCustomerByPhone(phone) {
    const response = await api.get(`/customers/phone-lookup`, { params: { phone } });
    return response.result ?? null;
}

/** Tìm khách theo tên hoặc số điện thoại. */
export async function searchCustomers(keyword, size = 8) {
    const response = await api.get(`/customers/debts`, { params: { keyword, page: 1, size } });
    return response.result?.content ?? [];
}

export async function createQuickCustomer(payload) {
    const response = await api.post('/customers', payload);
    return response.result;
}

export async function createInvoice(payload) {
    const response = await api.post('/sales-orders', payload);
    return response.result;
}

export async function createDebtInvoice(payload) {
    const response = await api.post('/sales-orders/debt', payload);
    return response.result;
}

export async function getReceipt(invoiceId) {
    const response = await api.get(`/sales-orders/${invoiceId}/receipt`);
    return response.result;
}

export async function getInvoiceData(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/invoice`);
    return response.result;
}

export async function getSalesOrderHistory(params = {}) {
    const response = await api.get('/sales-orders', { params });
    return response.result;
}

export async function getOrderForExchange(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/exchange`);
    return response.result;
}

export async function processExchangeOrder(payload) {
    const response = await api.post('/sales-orders/exchange', payload);
    return response.result;
}

/** Mở phiên chuyển khoản cho giỏ hàng hiện tại, trả về mã QR để khách quét. */
export async function createPayosCheckout(payload) {
    const response = await api.post('/checkout/payos', payload);
    return response.result;
}

/** Hỏi lại trạng thái phiên — POS gọi theo nhịp trong lúc khách quét. */
export async function getPayosCheckoutStatus(payosOrderCode) {
    const response = await api.get(`/checkout/payos/${payosOrderCode}`);
    return response.result;
}

/** Thu ngân đóng khung QR. Phiên đã thu tiền thì BE từ chối hủy. */
export async function cancelPayosCheckout(payosOrderCode, reason) {
    const response = await api.post(
        `/checkout/payos/${payosOrderCode}/cancel`,
        null,
        { params: reason ? { reason } : undefined },
    );
    return response.result;
}
