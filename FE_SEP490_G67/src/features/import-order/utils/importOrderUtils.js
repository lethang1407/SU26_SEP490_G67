import { IMPORT_ORDER_STATUS, ORDER_STATUS_FILTER } from '../constants';

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

/** Hiển thị số tiền trong ô input: 1000000 → 1.000.000 */
export function formatMoneyInput(value) {
    const amount = Math.max(0, Number(value) || 0);
    return new Intl.NumberFormat('vi-VN').format(amount);
}

/** Parse ô nhập tiền có dấu chấm/phẩy về số nguyên VND */
export function parseMoneyInput(text) {
    const digits = String(text ?? '').replace(/[^\d]/g, '');
    if (!digits) return 0;
    return Number(digits);
}

export function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
}

export function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function computeLineTotal(line) {
    const quantity = Number(line.quantity) || 0;
    const costPerUnit = Number(line.costPerUnit) || 0;
    return quantity * costPerUnit;
}

/** Đơn giá gợi ý = giá / ĐVT cơ bản × hệ số ĐVT đang chọn. */
export function suggestCostForUnit(lastCostPerBase, unitBase) {
    const base = Number(lastCostPerBase) || 0;
    const factor = Number(unitBase) > 0 ? Number(unitBase) : 1;
    return Math.round(base * factor);
}

/**
 * Cảnh báo giá ngay trên dòng (không popup).
 * @returns {{ level: 'danger' | 'warn', message: string } | null}
 */
export function getLinePriceWarning(line) {
    if (!line || line.isPromotion) return null;

    const unitBase = Number(line.unitBase) > 0 ? Number(line.unitBase) : 1;
    const costPerUnit = Number(line.costPerUnit) || 0;
    if (costPerUnit <= 0) return null;

    const newCostBase = costPerUnit / unitBase;
    const lastCost = Number(line.lastCostPerBase) || 0;
    const selling = Number(line.sellingPrice) || 0;

    if (selling > 0 && newCostBase >= selling) {
        return {
            level: 'danger',
            message: 'Giá nhập ≥ giá bán — có thể lỗ, nên tăng giá bán.',
        };
    }
    if (lastCost > 0 && newCostBase > lastCost) {
        return {
            level: 'warn',
            message: 'Cao hơn giá vốn lần trước — nên xem lại giá bán.',
        };
    }
    return null;
}

export function buildImportSummary(lines) {
    const totalLines = lines.length;
    const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const totalCost = lines.reduce((sum, line) => sum + computeLineTotal(line), 0);

    return {
        totalLines,
        totalQuantity,
        totalCost,
    };
}

export function filterImportOrders(items, { keyword, statusFilter, dateFilter, orderStatusFilter }) {
    const normalizedKeyword = keyword?.trim().toLowerCase() ?? '';
    const now = new Date();
    const statusValue = orderStatusFilter ?? statusFilter ?? 'all';

    return items.filter((item) => {
        const matchesKeyword =
            !normalizedKeyword ||
            item.orderCode?.toLowerCase().includes(normalizedKeyword) ||
            item.supplierCode?.toLowerCase().includes(normalizedKeyword) ||
            item.supplierName?.toLowerCase().includes(normalizedKeyword) ||
            item.note?.toLowerCase().includes(normalizedKeyword);

        const itemStatus = item.orderStatus ?? item.status;
        const matchesStatus =
            statusValue === 'all' ||
            statusValue === ORDER_STATUS_FILTER.ALL ||
            itemStatus === statusValue;

        let matchesDate = true;
        if (dateFilter === 'this_month') {
            const receivedDate = new Date(item.receivedDate);
            matchesDate =
                receivedDate.getMonth() === now.getMonth() &&
                receivedDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'last_month') {
            const receivedDate = new Date(item.receivedDate);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            matchesDate =
                receivedDate.getMonth() === lastMonth.getMonth() &&
                receivedDate.getFullYear() === lastMonth.getFullYear();
        }

        return matchesKeyword && matchesStatus && matchesDate;
    });
}

export function paginateItems(items, page, pageSize) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
        items: items.slice(startIndex, endIndex),
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        startIndex: totalItems === 0 ? 0 : startIndex + 1,
        endIndex,
    };
}

export function searchProducts(products, keyword) {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
        return [];
    }

    return products.filter(
        (product) =>
            product.productName.toLowerCase().includes(normalized) ||
            product.productCode.toLowerCase().includes(normalized) ||
            product.barcode?.includes(normalized),
    );
}

/** Kệ trống hoặc đang chứa đúng loại SP (quy tắc 1 kệ = 1 SP) */
export function getAvailableLocationsForProduct(locations, productCode) {
    return locations.filter((location) => {
        const contents = location.contents ?? [];
        if (contents.length === 0) {
            return true;
        }
        return contents.every((item) => item.productCode === productCode);
    });
}

export function createLineFromProduct(product) {
    return {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productCode: product.productCode || product.code || product.barcode || `SP${product.id}`,
        productName: product.productName || product.name,
        unit: product.unit || 'Cái',
        quantity: 1,
        costPerUnit: Number(product.defaultCost ?? product.importPrice ?? product.costPrice ?? 0),
        expiryDate: '',
        locationId: '',
        locationLabel: '',
        hasExpiry: true,
    };
}

export function mapProductForSearch(product) {
    return {
        id: product.id,
        productCode: product.code || product.barcode || `SP${String(product.id).padStart(5, '0')}`,
        productName: product.name,
        unit: product.unit || 'Cái',
        barcode: product.barcode || '',
        defaultCost: Number(product.importPrice ?? 0),
        hasExpiry: true,
    };
}

export function buildCreateImportPayload({ supplierId, receivedDate, note, lines }) {
    return {
        supplierId: Number(supplierId),
        receivedDate: receivedDate || undefined,
        note: note?.trim() || undefined,
        items: lines.map((line) => ({
            productId: Number(line.productId),
            quantity: Number(line.quantity),
            costPerUnit: Number(line.costPerUnit),
            expiryDate: line.expiryDate || null,
            locationId: line.locationId ? Number(line.locationId) : null,
        })),
    };
}

export function validateImportForm({ supplierId, lines }) {
    if (!supplierId) {
        return 'Vui lòng chọn nhà cung cấp.';
    }

    if (lines.length === 0) {
        return 'Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.';
    }

    for (const line of lines) {
        const quantity = Number(line.quantity);
        const costPerUnit = Number(line.costPerUnit);

        if (!quantity || quantity <= 0) {
            return `Số lượng nhập của "${line.productName}" phải lớn hơn 0.`;
        }

        if (costPerUnit < 0 || Number.isNaN(costPerUnit)) {
            return `Đơn giá của "${line.productName}" không hợp lệ.`;
        }
    }

    return null;
}

export function isReceivedStatus(status) {
    return status === IMPORT_ORDER_STATUS.RECEIVED || status === IMPORT_ORDER_STATUS.DONE;
}
