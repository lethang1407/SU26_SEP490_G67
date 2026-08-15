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

export async function moveAllBatchesFromLocation({ fromLocationId, toLocationId }) {
    const response = await api.post('/storage-locations/move-all', {
        fromLocationId,
        toLocationId,
    });
    return response.result;
}

export async function unassignBatchFromLocation({ batchLocationId }) {
    const response = await api.post('/storage-locations/unassign-batch', {
        batchLocationId,
    });
    return response.result;
}

export async function setStorageLocationFull(locationId, isFull) {
    const response = await api.post(`/storage-locations/${locationId}/full`, { isFull });
    return response.result;
}

export async function fetchStorageZones() {
    const response = await api.get('/storage-zones');
    return response.result ?? [];
}

export async function updateStorageZone(code, payload) {
    const response = await api.put(`/storage-zones/${encodeURIComponent(code)}`, payload);
    return response.result;
}
