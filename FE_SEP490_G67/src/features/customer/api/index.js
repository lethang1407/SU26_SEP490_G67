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
    return response; // Trả về toàn bộ response để kiểm tra message và code
}