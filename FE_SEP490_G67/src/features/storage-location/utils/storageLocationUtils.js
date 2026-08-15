import {
    LOCATION_STATUS,
    NEAR_EXPIRY_DAYS,
    SHELF_CAPACITY,
    SHELF_SIZE,
    SHELF_SIZE_LABEL,
    ZONE_TYPE,
    isReturnHoldLocation,
    normalizeShelfSize,
    normalizeZoneType,
} from '../constants';

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

export function formatDateTime(dateString) {
    if (!dateString) {
        return '—';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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

/** Mã vị trí: A-T1-O3 */
export function buildLocationLabel({ zone, shelf, bin }) {
    if (!zone?.trim() || !shelf?.trim() || !bin?.trim()) {
        return '';
    }
    return `${zone.trim().toUpperCase()}-T${String(shelf).trim()}-O${String(bin).trim()}`;
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

/** Danh sách SP distinct trên ô (theo productCode). */
export function getLocationProducts(location) {
    const contents = location.contents ?? [];
    const map = new Map();
    for (const item of contents) {
        const key = item.productCode || item.productName || String(item.id);
        if (!map.has(key)) {
            map.set(key, {
                productCode: item.productCode,
                productName: item.productName,
                unit: item.unit,
            });
        }
    }
    return [...map.values()];
}

export function getLocationProductPreview(location, maxNames = 2) {
    const products = getLocationProducts(location);
    if (products.length === 0) {
        return '';
    }
    const names = products.map((p) => shortenProductName(p.productName)).filter(Boolean);
    if (names.length <= maxNames) {
        return names.join(', ');
    }
    return `${names.slice(0, maxNames).join(', ')} +${names.length - maxNames}`;
}

export function getLocationMetrics(location) {
    const contents = location.contents ?? [];
    const batchLineCount = contents.length;
    const totalQty = contents.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const batchCount = new Set(contents.map((item) => item.batchCode)).size;
    const hasNearExpiry = contents.some((item) => isNearExpiry(item.expiryDate));
    const products = getLocationProducts(location);
    const product = products[0] ?? null;
    const productCount = products.length;

    return {
        batchLineCount,
        totalQty,
        batchCount,
        hasNearExpiry,
        product,
        products,
        productCount,
        isEmpty: batchLineCount === 0,
    };
}

export function getLocationStatus(location) {
    const { isEmpty, hasNearExpiry } = getLocationMetrics(location);

    if (isEmpty) {
        return LOCATION_STATUS.EMPTY;
    }
    if (location.isFull) {
        return LOCATION_STATUS.FULL;
    }
    if (hasNearExpiry) {
        return LOCATION_STATUS.NEAR_EXPIRY;
    }
    return LOCATION_STATUS.OCCUPIED;
}

export function formatLocationAddress(location) {
    const parts = [`Kệ ${location.zone}`];
    if (location.shelf) {
        parts.push(`Tầng ${location.shelf}`);
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
    const zones = [
        ...new Set(
            locations
                .filter((item) => !isReturnHoldLocation(item))
                .map((item) => item.zone)
                .filter(Boolean),
        ),
    ].sort();
    return [
        { value: 'all', label: 'Tất cả khu' },
        ...zones.map((zone) => ({
            value: zone,
            label: `Kệ ${zone}`,
        })),
    ];
}

export function getFloorOptions(locations, zoneFilter) {
    const filtered =
        zoneFilter === 'all' ? locations : locations.filter((item) => item.zone === zoneFilter);
    const floors = [...new Set(filtered.map((item) => item.shelf).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true }),
    );
    return [
        { value: 'all', label: 'Tất cả tầng' },
        ...floors.map((floor) => ({ value: floor, label: `Tầng ${floor}` })),
    ];
}

/** @deprecated dùng getFloorOptions */
export function getAisleOptions(locations, zoneFilter) {
    return getFloorOptions(locations, zoneFilter);
}

export function filterStorageLocations(locations, filters) {
    const keyword = filters.keyword?.trim().toLowerCase() ?? '';
    const floorFilter = filters.floorFilter ?? filters.aisleFilter ?? 'all';

    return locations.filter((location) => {
        const status = getLocationStatus(location);

        if (filters.zoneFilter !== 'all' && location.zone !== filters.zoneFilter) {
            return false;
        }
        if (floorFilter !== 'all' && String(location.shelf ?? '') !== String(floorFilter)) {
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
                location.shelf,
                location.bin,
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

/** Kích thước ô từ BE (`size`: SM|MD|LG). Fallback MD nếu thiếu. */
export function getShelfProfile(location) {
    const size = normalizeShelfSize(location.size);
    const capacity = SHELF_CAPACITY[size];
    const { totalQty, isEmpty } = getLocationMetrics(location);
    const fillRatio = capacity > 0 ? Math.min(totalQty, capacity) / capacity : 0;
    const remainingQty = Math.max(capacity - totalQty, 0);

    return {
        size,
        sizeLabel: SHELF_SIZE_LABEL[size],
        capacity,
        usedQty: totalQty,
        remainingQty,
        fillRatio,
        fillPercent: Math.round(Math.min(fillRatio, 1) * 100),
        isFull: !isEmpty && totalQty >= capacity,
        isNearFull: !isEmpty && fillRatio >= 0.8 && totalQty < capacity,
    };
}

export function buildZoneCapacityStats(locations) {
    let emptyCount = 0;
    let occupiedCount = 0;
    let nearExpiryCount = 0;
    let totalCapacity = 0;
    let usedCapacity = 0;
    let remainingCapacity = 0;
    let largeEmpty = 0;
    let mediumEmpty = 0;
    let smallEmpty = 0;

    locations.forEach((location) => {
        const status = getLocationStatus(location);
        const profile = getShelfProfile(location);

        totalCapacity += profile.capacity;
        usedCapacity += Math.min(profile.usedQty, profile.capacity);
        remainingCapacity += profile.remainingQty;

        if (status === LOCATION_STATUS.EMPTY) {
            emptyCount += 1;
            if (profile.size === SHELF_SIZE.LG) {
                largeEmpty += 1;
            } else if (profile.size === SHELF_SIZE.SM) {
                smallEmpty += 1;
            } else {
                mediumEmpty += 1;
            }
        } else {
            occupiedCount += 1;
        }
        if (status === LOCATION_STATUS.NEAR_EXPIRY) {
            nearExpiryCount += 1;
        }
    });

    const fillPercent =
        totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

    return {
        totalLocations: locations.length,
        emptyCount,
        occupiedCount,
        nearExpiryCount,
        totalCapacity,
        usedCapacity,
        remainingCapacity,
        fillPercent,
        largeEmpty,
        mediumEmpty,
        smallEmpty,
    };
}

export function groupLocationsByFloor(locations) {
    const floors = new Map();

    locations.forEach((location) => {
        const key = location.shelf?.trim() || '_none';
        if (!floors.has(key)) {
            floors.set(key, {
                floor: key === '_none' ? null : key,
                locations: [],
            });
        }
        floors.get(key).locations.push(location);
    });

    return [...floors.values()]
        .map((group) => ({
            ...group,
            locations: group.locations.sort((a, b) => {
                const binA = String(a.bin ?? '');
                const binB = String(b.bin ?? '');
                return (
                    binA.localeCompare(binB, undefined, { numeric: true }) ||
                    a.label.localeCompare(b.label)
                );
            }),
        }))
        .sort((a, b) => {
            if (!a.floor) return 1;
            if (!b.floor) return -1;
            return String(a.floor).localeCompare(String(b.floor), undefined, { numeric: true });
        });
}

/** @deprecated dùng groupLocationsByFloor */
export function groupLocationsByAisle(locations) {
    return groupLocationsByFloor(locations).map((group) => ({
        aisle: group.floor,
        locations: group.locations,
    }));
}

export function shortenProductName(productName) {
    if (!productName?.trim()) {
        return '';
    }

    let cleaned = productName
        .replace(/\b\d+([.,]\d+)?\s*(ml|cl|l|mg|g|kg|oz|lb)\b/gi, ' ')
        .replace(/\b\d+([.,]\d+)?\s*(hộp|gói|chai|lon|thùng|túi|vỉ)\b/gi, ' ')
        .replace(/[()[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return productName.trim();
    }

    const words = cleaned.split(' ').filter(Boolean);
    if (words.length <= 2) {
        return words.join(' ');
    }

    const firstTwo = words.slice(0, 2).join(' ').toLowerCase();
    const keepThree =
        /^(nước giải|sữa tươi|sữa chua|dầu ăn|bánh mì|trứng gà|nước ngọt|nước lọc|nước suối|gia vị)$/i.test(
            firstTwo,
        );

    return words.slice(0, keepThree ? 3 : 2).join(' ');
}

export function getZoneProductPreview(locations, maxNames = 3) {
    const names = [];
    const seen = new Set();

    for (const location of locations ?? []) {
        for (const item of location.contents ?? []) {
            const shortName = shortenProductName(item.productName);
            if (!shortName) {
                continue;
            }
            const key = shortName.toLowerCase();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            names.push(shortName);
        }
    }

    if (names.length === 0) {
        return 'Chưa có hàng';
    }

    if (names.length <= maxNames) {
        return names.join(', ');
    }

    return `${names.slice(0, maxNames).join(', ')}...`;
}

export function groupLocationsByZone(locations) {
    const groups = new Map();

    locations.forEach((location) => {
        if (!groups.has(location.zone)) {
            groups.set(location.zone, {
                zone: location.zone,
                zoneType: normalizeZoneType(location.zoneType),
                zoneTitle: location.zoneTitle,
                locations: [],
            });
        }
        const group = groups.get(location.zone);
        group.locations.push(location);
        if (location.zoneType) {
            group.zoneType = normalizeZoneType(location.zoneType);
        }
        if (location.zoneTitle) {
            group.zoneTitle = location.zoneTitle;
        }
    });

    const mapped = [...groups.values()].map((group) => {
        const sorted = group.locations.sort((a, b) => {
            const floorCmp = String(a.shelf ?? '').localeCompare(String(b.shelf ?? ''), undefined, {
                numeric: true,
            });
            if (floorCmp !== 0) return floorCmp;
            const binCmp = String(a.bin ?? '').localeCompare(String(b.bin ?? ''), undefined, {
                numeric: true,
            });
            if (binCmp !== 0) return binCmp;
            return a.label.localeCompare(b.label);
        });
        const floors = groupLocationsByFloor(sorted);
        return {
            ...group,
            locations: sorted,
            productPreview: getZoneProductPreview(sorted, 3),
            floors,
            aisles: floors.map((g) => ({
                aisle: g.floor,
                locations: g.locations,
            })),
            stats: buildZoneCapacityStats(sorted),
        };
    });

    // Khu bán trước, khu kho sau; trong nhóm sort theo mã khu
    return mapped.sort((a, b) => {
        const typeA = a.zoneType === 'SALES' ? 0 : 1;
        const typeB = b.zoneType === 'SALES' ? 0 : 1;
        if (typeA !== typeB) return typeA - typeB;
        return String(a.zone ?? '').localeCompare(String(b.zone ?? ''));
    });
}

/** Nhóm zone groups thành section: bán hàng / kho (bỏ RETURN_HOLD). */
export function groupZoneGroupsByType(zoneGroups) {
    const sales = [];
    const warehouse = [];
    (zoneGroups ?? []).forEach((group) => {
        const type = normalizeZoneType(group.zoneType);
        if (type === ZONE_TYPE.RETURN_HOLD) {
            return;
        }
        if (type === ZONE_TYPE.SALES) {
            sales.push(group);
        } else {
            warehouse.push(group);
        }
    });
    return { sales, warehouse };
}

export function getReturnHoldLocation(locations) {
    return (locations ?? []).find((location) => isReturnHoldLocation(location)) ?? null;
}

export function getShelfLocations(locations) {
    return (locations ?? []).filter((location) => !isReturnHoldLocation(location));
}

export function getLineValue(item) {
    const qty = Number(item?.quantity ?? 0);
    const price = Number(item?.importPrice ?? 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) {
        return 0;
    }
    return qty * price;
}

/**
 * Gợi ý ô xếp cho 1 lô (unplaced hoặc dòng trên kệ).
 * Ưu tiên: cùng lô > cùng SP > cùng danh mục > ô trống.
 * Nếu SP đã có mã lô khác trên khu bán → không gợi ý khu bán (chỉ khu kho).
 * Cùng mã lô đã xếp một phần trên khu bán → vẫn gợi ý các ô đó để xếp tiếp.
 */
export function suggestLocationsForBatch(batch, locations, options = {}) {
    if (!batch) {
        return [];
    }
    const excludeLocationId = options.excludeLocationId ?? null;
    const productId = batch.productId ?? null;
    const categoryId = batch.categoryId ?? null;
    const preferredZone = options.preferredZone ?? null;
    const batchId = batch.batchId ?? batch.id ?? null;
    const batchCode = batch.batchCode ?? null;

    const isSameBatch = (item) => {
        if (!item) {
            return false;
        }
        if (batchId != null && item.batchId != null) {
            return item.batchId === batchId;
        }
        if (batchCode && item.batchCode) {
            return String(item.batchCode) === String(batchCode);
        }
        return false;
    };

    // SP đã có mã lô khác trên khu bán → chặn gợi ý khu bán
    const salesHasOtherBatchOfProduct =
        productId != null &&
        (locations ?? []).some(
            (location) =>
                location &&
                location.id !== excludeLocationId &&
                location.zoneType === ZONE_TYPE.SALES &&
                (location.contents ?? []).some(
                    (item) => item.productId === productId && !isSameBatch(item),
                ),
        );

    const scored = [];
    for (const location of locations ?? []) {
        if (!location || location.id === excludeLocationId) {
            continue;
        }
        if (isReturnHoldLocation(location)) {
            continue;
        }
        if (location.isFull) {
            continue;
        }

        const isWarehouse = normalizeZoneType(location.zoneType) === ZONE_TYPE.WAREHOUSE;
        if (!isWarehouse && salesHasOtherBatchOfProduct) {
            continue;
        }

        const contents = location.contents ?? [];
        const occupiedProductIds = [
            ...new Set(contents.map((item) => item.productId).filter((id) => id != null)),
        ];
        const occupiedCategoryIds = [
            ...new Set(contents.map((item) => item.categoryId).filter((id) => id != null)),
        ];
        const isEmpty = contents.length === 0;
        const hasSameBatch = contents.some(isSameBatch);

        if (
            isWarehouse &&
            occupiedProductIds.length > 0 &&
            productId != null &&
            !occupiedProductIds.includes(productId)
        ) {
            continue;
        }

        let score = 0;
        let reason = '';

        if (hasSameBatch) {
            score = 120;
            reason = 'cùng lô';
        } else if (productId != null && occupiedProductIds.includes(productId)) {
            score = 100;
            reason = 'cùng SP';
        } else if (
            categoryId != null &&
            occupiedCategoryIds.includes(categoryId) &&
            (!isWarehouse || isEmpty)
        ) {
            score = 70;
            reason = 'cùng danh mục';
        } else if (isEmpty) {
            score = 50;
            reason = 'ô trống';
        } else if (!isWarehouse) {
            score = 20;
            reason = 'khu bán';
        } else {
            continue;
        }

        if (preferredZone && location.zone === preferredZone) {
            score += 5;
        }

        scored.push({
            locationId: location.id,
            label: location.label,
            zone: location.zone,
            score,
            reason,
        });
    }

    return scored
        .sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label)))
        .slice(0, 6);
}

