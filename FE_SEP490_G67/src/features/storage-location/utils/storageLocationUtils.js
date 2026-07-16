import { LOCATION_STATUS, NEAR_EXPIRY_DAYS } from '../constants';

export function formatCurrency(value) {
    if (value === null || value === undefined) {
        return '—';
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDate(dateString) {
    if (!dateString) {
        return '—';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString('vi-VN');
}

export function isNearExpiry(expiryDate, referenceDate = new Date()) {
    if (!expiryDate) {
        return false;
    }
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) {
        return false;
    }
    const diffMs = expiry.getTime() - referenceDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS;
}

export function buildLocationLabel({ zone, aisle, shelf, bin }) {
    if (!zone?.trim()) {
        return '';
    }

    const parts = [zone.trim().toUpperCase()];

    if (aisle?.trim()) {
        parts.push(aisle.trim().padStart(2, '0'));
    }
    if (shelf?.trim()) {
        parts.push(shelf.trim().padStart(2, '0'));
    }
    if (bin?.trim()) {
        parts.push(bin.trim().padStart(2, '0'));
    }

    return parts.join('-');
}

export function getLocationProduct(location) {
    const contents = location.contents ?? [];
    if (contents.length === 0) {
        return null;
    }
    const first = contents[0];
    return {
        productCode: first.productCode,
        productName: first.productName,
        unit: first.unit,
    };
}

export function getLocationMetrics(location) {
    const contents = location.contents ?? [];
    const batchLineCount = contents.length;
    const totalQty = contents.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const batchCount = new Set(contents.map((item) => item.batchCode)).size;
    const hasNearExpiry = contents.some((item) => isNearExpiry(item.expiryDate));
    const product = getLocationProduct(location);

    return {
        batchLineCount,
        totalQty,
        batchCount,
        hasNearExpiry,
        product,
        isEmpty: batchLineCount === 0,
    };
}

export function getLocationStatus(location) {
    const { isEmpty, hasNearExpiry } = getLocationMetrics(location);

    if (isEmpty) {
        return LOCATION_STATUS.EMPTY;
    }
    if (hasNearExpiry) {
        return LOCATION_STATUS.NEAR_EXPIRY;
    }
    return LOCATION_STATUS.OCCUPIED;
}

export function formatLocationAddress(location) {
    const parts = [`Khu ${location.zone}`];
    if (location.aisle) {
        parts.push(`Lối ${location.aisle}`);
    }
    if (location.shelf) {
        parts.push(`Kệ ${location.shelf}`);
    }
    if (location.bin) {
        parts.push(`Ô ${location.bin}`);
    }
    return parts.join(' · ');
}

export function buildLocationSummary(locations) {
    let occupiedCount = 0;
    let emptyCount = 0;
    let nearExpiryCount = 0;

    locations.forEach((location) => {
        const status = getLocationStatus(location);
        if (status === LOCATION_STATUS.EMPTY) {
            emptyCount += 1;
        } else {
            occupiedCount += 1;
        }
        if (status === LOCATION_STATUS.NEAR_EXPIRY) {
            nearExpiryCount += 1;
        }
    });

    return {
        totalLocations: locations.length,
        occupiedCount,
        emptyCount,
        nearExpiryCount,
    };
}

export function getZoneOptions(locations) {
    const zones = [...new Set(locations.map((item) => item.zone))].sort();
    return [
        { value: 'all', label: 'Tất cả khu' },
        ...zones.map((zone) => {
            const sample = locations.find((item) => item.zone === zone);
            return {
                value: zone,
                label: `Khu ${zone}${sample?.zoneTitle ? ` — ${sample.zoneTitle}` : ''}`,
            };
        }),
    ];
}

export function getAisleOptions(locations, zoneFilter) {
    const filtered =
        zoneFilter === 'all' ? locations : locations.filter((item) => item.zone === zoneFilter);
    const aisles = [...new Set(filtered.map((item) => item.aisle).filter(Boolean))].sort();
    return [
        { value: 'all', label: 'Tất cả lối' },
        ...aisles.map((aisle) => ({ value: aisle, label: `Lối ${aisle}` })),
    ];
}

export function filterStorageLocations(locations, filters) {
    const keyword = filters.keyword?.trim().toLowerCase() ?? '';

    return locations.filter((location) => {
        const status = getLocationStatus(location);

        if (filters.zoneFilter !== 'all' && location.zone !== filters.zoneFilter) {
            return false;
        }
        if (filters.aisleFilter !== 'all' && location.aisle !== filters.aisleFilter) {
            return false;
        }
        if (filters.statusFilter !== 'all' && status !== filters.statusFilter) {
            return false;
        }
        if (keyword) {
            const haystack = [
                location.label,
                location.zone,
                location.zoneTitle,
                location.description,
                ...(location.contents ?? []).flatMap((item) => [
                    item.productName,
                    item.productCode,
                    item.batchCode,
                ]),
            ]
                .join(' ')
                .toLowerCase();

            if (!haystack.includes(keyword)) {
                return false;
            }
        }
        return true;
    });
}

export function groupLocationsByZone(locations) {
    const groups = new Map();

    locations.forEach((location) => {
        if (!groups.has(location.zone)) {
            groups.set(location.zone, {
                zone: location.zone,
                title: location.zoneTitle ?? `Khu ${location.zone}`,
                locations: [],
            });
        }
        groups.get(location.zone).locations.push(location);
    });

    return [...groups.values()].map((group) => ({
        ...group,
        locations: group.locations.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
