import { api } from '@/lib/api-clien';

export async function getOverviewCustomer() {
    const response = await api.get('/customers/overview');
    return response.result;
}

export async function getCustomerDebts(params) {
    const response = await api.get('/customers/debts', { params });
    return response.result;
}

export async function createCustomerDebt(data) {
    const response = await api.post('/customers', data);
    return response; 
}

export async function updateCustomer(customerId, data) {
    const response = await api.put(`/customers/${customerId}`, data);
    return response; 
}

export async function getCustomerDetail(customerId) {
    const response = await api.get(`/customers/${customerId}`);
    return response.result;
}

export async function getCustomerDebtOrders(customerId, params) {
    const response = await api.get(`/customers/${customerId}/debt-orders`, { params });
    return response.result;
}

export async function getTodayDebtSummary() {
    const response = await api.get('/customers/today-debt-summary');
    return response.result;
}


export async function getDebtPaymentHistory(params) {
    const response = await api.get('/debt-payments', { params });
    return response.result;
}

export async function getTodayDebtPayments(params) {
    const response = await api.get('/debt-payments/today', { params });
    return response.result;
}

export async function createDebtPayment(data) {
    // const response = await api.post('/debt-payments', data);
    // return response;
    return null;
}

export async function getSalesOrderDetail(orderId) {
    const response = await api.get(`/sales-orders/${orderId}/detail`);
    return response.result;
}