import { api } from '@/lib/api-clien';

export async function fetchInventoryChecks({
    page = 0,
    size = 10,
    search = '',
    status = 'all',
} = {}) {
    const params = { page, size, status };
    if (search?.trim()) {
        params.search = search.trim();
    }
    const response = await api.get('/inventory-checks', { params });
    return (
        response.result ?? {
            content: [],
            page: 0,
            size,
            totalElements: 0,
            totalPages: 1,
        }
    );
}

export async function fetchInventoryCheckById(id) {
    const response = await api.get(`/inventory-checks/${id}`);
    return response.result;
}

export async function fetchAvailableCheckLines(location = 'all') {
    const response = await api.get('/inventory-checks/available-lines', {
        params: { location },
    });
    return response.result ?? [];
}

export async function fetchCheckLocationOptions() {
    const response = await api.get('/inventory-checks/location-options');
    return response.result ?? [];
}

export async function createInventoryCheck(payload) {
    const response = await api.post('/inventory-checks', payload);
    return response.result;
}
