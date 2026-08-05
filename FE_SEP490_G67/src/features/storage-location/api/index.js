import { api } from '@/lib/api-clien';

export async function fetchStorageLocations() {
    const response = await api.get('/storage-locations');
    return response.result ?? [];
}

export async function fetchStorageLocationById(locationId) {
    const response = await api.get(`/storage-locations/${locationId}`);
    return response.result;
}

export async function createStorageLocation(payload) {
    const response = await api.post('/storage-locations', payload);
    return response.result;
}

export async function fetchUnplacedBatches() {
    const response = await api.get('/storage-locations/unplaced-batches');
    return response.result ?? [];
}

export async function assignBatchToLocation({ batchId, locationId, quantity }) {
    const response = await api.post('/storage-locations/assign-batch', {
        batchId,
        locationId,
        quantity,
    });
    return response.result;
}

export async function moveBatchLocation({ batchLocationId, toLocationId, quantity }) {
    const response = await api.post('/storage-locations/move-batch', {
        batchLocationId,
        toLocationId,
        quantity,
    });
    return response.result;
}

export async function unassignBatchFromLocation({ batchLocationId }) {
    const response = await api.post('/storage-locations/unassign-batch', {
        batchLocationId,
    });
    return response.result;
}

export async function setPrimarySaleLocation(locationId) {
    const response = await api.post(`/storage-locations/${locationId}/primary-sale`);
    return response.result;
}
