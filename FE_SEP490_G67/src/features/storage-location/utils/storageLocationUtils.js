import {
    LOCATION_STATUS,
    NEAR_EXPIRY_DAYS,
    SHELF_CAPACITY,
    SHELF_SIZE,
    SHELF_SIZE_LABEL,
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
        parts.push(`Hàng ${location.aisle}`);
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
        ...zones.map((zone) => ({
                value: zone,
                label: `Khu ${zone}`,
            })),
    ];
}

export function getAisleOptions(locations, zoneFilter) {
    const filtered =
        zoneFilter === 'all' ? locations : locations.filter((item) => item.zone === zoneFilter);
    const aisles = [...new Set(filtered.map((item) => item.aisle).filter(Boolean))].sort();
    return [
        { value: 'all', label: 'Tất cả hàng' },
        ...aisles.map((aisle) => ({ value: aisle, label: `Hàng ${aisle}` })),
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

/**
 * Ước lượng kích thước / sức chứa ô kệ khi BE chưa có field riêng.
 * Ưu tiên: mô tả chứa từ khóa → tầng kệ (thấp = lớn) → mặc định vừa.
 */
export function getShelfProfile(location) {
    const description = (location.description ?? '').toLowerCase();
    let size = SHELF_SIZE.MD;

    if (
        /\b(ô lớn|o lon|pallet|lớn|lon)\b/i.test(description) ||
        description.includes('large') ||
        description.includes('lg')
    ) {
        size = SHELF_SIZE.LG;
    } else if (
        /\b(ô nhỏ|o nho|nhỏ|nho)\b/i.test(description) ||
        description.includes('small') ||
        description.includes('sm')
    ) {
        size = SHELF_SIZE.SM;
    } else {
        const shelfNum = Number.parseInt(String(location.shelf ?? '').replace(/\D/g, ''), 10);
        if (Number.isFinite(shelfNum)) {
            if (shelfNum <= 1) {
                size = SHELF_SIZE.LG;
            } else if (shelfNum === 2) {
                size = SHELF_SIZE.MD;
            } else {
                size = SHELF_SIZE.SM;
            }
        } else {
            const binNum = Number.parseInt(String(location.bin ?? '').replace(/\D/g, ''), 10);
            if (Number.isFinite(binNum)) {
                if (binNum % 5 === 1) {
                    size = SHELF_SIZE.LG;
                } else if (binNum % 2 === 0) {
                    size = SHELF_SIZE.MD;
                } else {
                    size = SHELF_SIZE.SM;
                }
            }
        }
    }

    const capacity = SHELF_CAPACITY[size];
    const { totalQty, isEmpty } = getLocationMetrics(location);
    const usedQty = Math.min(totalQty, capacity);
    const fillRatio = capacity > 0 ? usedQty / capacity : 0;
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

export function groupLocationsByAisle(locations) {
    const aisles = new Map();

    locations.forEach((location) => {
        const key = location.aisle?.trim() || '_none';
        if (!aisles.has(key)) {
            aisles.set(key, {
                aisle: key === '_none' ? null : key,
                locations: [],
            });
        }
        aisles.get(key).locations.push(location);
    });

    return [...aisles.values()]
        .map((group) => ({
            ...group,
            locations: group.locations.sort((a, b) => {
                const shelfA = String(a.shelf ?? '');
                const shelfB = String(b.shelf ?? '');
                const binA = String(a.bin ?? '');
                const binB = String(b.bin ?? '');
                return (
                    shelfA.localeCompare(shelfB, undefined, { numeric: true }) ||
                    binA.localeCompare(binB, undefined, { numeric: true }) ||
                    a.label.localeCompare(b.label)
                );
            }),
        }))
        .sort((a, b) => {
            if (!a.aisle) return 1;
            if (!b.aisle) return -1;
            return String(a.aisle).localeCompare(String(b.aisle), undefined, { numeric: true });
        });
}

/**
 * Rút gọn tên SP hiển thị nhanh: bỏ dung tích/khối lượng, lấy cụm loại hàng.
 * VD: "Nước mắm Nam Ngư 500ml" → "Nước mắm"
 */
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
    const keepThree = /^(nước giải|sữa tươi|sữa chua|dầu ăn|bánh mì|trứng gà|nước ngọt|nước lọc|nước suối|gia vị)$/i.test(
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
                locations: [],
            });
        }
        groups.get(location.zone).locations.push(location);
    });

    return [...groups.values()].map((group) => {
        const sorted = group.locations.sort((a, b) => a.label.localeCompare(b.label));
        return {
            ...group,
            locations: sorted,
            productPreview: getZoneProductPreview(sorted, 3),
            aisles: groupLocationsByAisle(sorted),
            stats: buildZoneCapacityStats(sorted),
        };
    });
}
