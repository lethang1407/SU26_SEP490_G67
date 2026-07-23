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