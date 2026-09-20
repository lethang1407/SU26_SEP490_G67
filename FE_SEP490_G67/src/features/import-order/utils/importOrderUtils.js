import { IMPORT_ORDER_STATUS, MAX_IMPORT_QUANTITY, ORDER_STATUS_FILTER } from '../constants';

export { MAX_IMPORT_QUANTITY };

const MAX_IMPORT_QTY_DIGITS = String(MAX_IMPORT_QUANTITY).length;

/** Parse ô số lượng: chỉ chữ số, tối đa 6 ký tự. Trả '' khi đang xóa. */
export function parseQtyInput(text) {
    const digits = String(text ?? '').replace(/[^\d]/g, '').slice(0, MAX_IMPORT_QTY_DIGITS);
    if (!digits) return '';
    return Number(digits);
}

/** Chốt số lượng khi rời ô: nguyên, 1–MAX_IMPORT_QUANTITY. */
export function normalizeQty(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) return 1;
    return Math.min(n, MAX_IMPORT_QUANTITY);
}

export function isValidImportQuantity(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= MAX_IMPORT_QUANTITY;
}

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

/** Số tiền không kèm đơn vị, dùng trong popup chi tiết. */
export function formatMoneyPlain(value) {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat('vi-VN').format(amount);
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

/** KM: không cộng vào tiền cần trả. Bán thử: cộng vào công nợ lúc nhập. */
export function resolveLineType(line) {
    if (!line) return 'REGULAR';
    if (line.lineType === 'TRIAL' || line.isTrial) return 'TRIAL';
    if (line.lineType === 'PROMOTION' || line.isPromotion) return 'PROMOTION';
    return line.lineType === 'REGULAR' ? 'REGULAR' : 'REGULAR';
}

export function isTrialLine(line) {
    return resolveLineType(line) === 'TRIAL';
}

export function isPromotionLine(line) {
    return resolveLineType(line) === 'PROMOTION';
}

export function isNonPayableImportLine(line) {
    return isPromotionLine(line);
}

/** Tiền cần trả lúc nhập: hàng thường + bán thử (không gồm KM). */
export function computeLineTotal(line) {
    if (isNonPayableImportLine(line)) return 0;
    const quantity = Number(line.quantity) || 0;
    const costPerUnit = Number(line.costPerUnit) || 0;
    return quantity * costPerUnit;
}

/**
 * Thành tiền hiển thị trên dòng: KM = 0;
 * bán thử (kể cả đã quyết toán) = qty × giá lúc nhận — không lấy line_total sau chốt.
 */
export function computeDisplayLineTotal(line) {
    if (isPromotionLine(line)) return 0;
    const quantity = Number(line.quantity) || 0;
    const costPerUnit = Number(line.costPerUnit) || 0;
    return quantity * costPerUnit;
}

export function computeGoodsTotal(lines) {
    return (lines || []).reduce((sum, line) => sum + computeDisplayLineTotal(line), 0);
}

export function computeOpenTrialAmount(lines) {
    return (lines || []).reduce((sum, line) => {
        if (!isTrialLine(line) || line.trialStatus === 'SETTLED') return sum;
        return sum + (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
    }, 0);
}

/** Tổng phải trả sau khi đã chốt các dòng bán thử (0 = trả hết hàng). */
export function computeSettledTrialAmount(lines) {
    return (lines || []).reduce((sum, line) => {
        if (!isTrialLine(line) || line.trialStatus !== 'SETTLED') return sum;
        if (line.settledPayableAmount != null && line.settledPayableAmount !== '') {
            return sum + (Number(line.settledPayableAmount) || 0);
        }
        return sum;
    }, 0);
}

export function hasSettledTrial(lines) {
    return (lines || []).some((line) => isTrialLine(line) && line.trialStatus === 'SETTLED');
}

export function settlementLineByDetailId(settlements) {
    const map = new Map();
    (settlements || []).forEach((settlement) => {
        (settlement.lines || []).forEach((line) => {
            if (line?.importOrderDetailId != null && !map.has(line.importOrderDetailId)) {
                map.set(line.importOrderDetailId, line);
            }
        });
    });
    return map;
}

/**
 * Cột Kết quả quyết toán: Nhận → bán (POS) → hao hụt (đếm thiếu so với tồn) → hỏng → trả | giữ.
 * Không gộp hao hụt vào “bán”. Record cũ không có tồn hệ thống: bỏ bán/hao hụt, giữ hỏng/trả/giữ.
 */
export function formatTrialSettlementResult(line) {
    if (!line) return '—';
    const unit = line.unitName || line.baseUnitName || '';
    const unitLabel = unit ? ` ${unit}` : '';
    const received = Number(line.receivedQty) || 0;
    const counted = Number(line.countedRemainingQty) || 0;
    const unsellable = Number(line.unsellableQty) || 0;
    const returned = Number(line.returnedQty) || 0;
    const kept = Math.max(counted - unsellable, 0);
    const systemRemRaw = line.systemRemainingQty;
    const hasSystemRem = systemRemRaw != null && systemRemRaw !== '';
    const systemRem = Number(systemRemRaw) || 0;
    const sold = hasSystemRem ? Math.max(received - systemRem, 0) : 0;
    const shrinkage = hasSystemRem ? Math.max(systemRem - counted, 0) : 0;
    const parts = [`Nhận ${received}${unitLabel}`];
    if (sold > 0) parts.push(`bán ${sold}${unitLabel}`);
    if (shrinkage > 0) parts.push(`hao hụt ${shrinkage}${unitLabel}`);
    if (unsellable > 0) parts.push(`hỏng ${unsellable}${unitLabel}`);
    if (returned > 0) {
        parts.push(`trả ${returned}${unitLabel}`);
    } else if (line.decision === 'PAY_ALL_KEEP' && kept > 0) {
        parts.push(`giữ ${kept}${unitLabel}`);
    }
    return parts.join(', ');
}

/** Chú thích dòng bán thử đã chốt: kết quả + phải trả. */
export function describeSettledTrial(line, settlementLine) {
    const source = settlementLine || line;
    const parts = [];
    if (settlementLine) {
        parts.push(formatTrialSettlementResult(settlementLine));
    } else if (source?.returnedQty > 0) {
        const unit = source.unitName || source.baseUnitName || line?.unitName || '';
        parts.push(`Trả lại ${source.returnedQty}${unit ? ` ${unit}` : ''}`);
    } else if (source?.decision === 'PAY_ALL_KEEP') {
        parts.push('Giữ hết');
    }
    const payableRaw = settlementLine?.payableAmount ?? line?.settledPayableAmount;
    if (payableRaw != null && payableRaw !== '') {
        parts.push(`Phải trả ${formatMoneyPlain(payableRaw)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Đã quyết toán';
}

/** Trần giảm giá lúc nhập: chỉ hàng thường, không KM / bán thử. */
export function computeRegularPayableAmount(lines) {
    return (lines || []).reduce((sum, line) => {
        if (resolveLineType(line) !== 'REGULAR') return sum;
        return sum + (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
    }, 0);
}

/** Đơn giá gợi ý = giá / ĐVT cơ bản × hệ số ĐVT đang chọn. */
export function suggestCostForUnit(lastCostPerBase, unitBase) {
    const base = Number(lastCostPerBase) || 0;
    const factor = Number(unitBase) > 0 ? Number(unitBase) : 1;
    return Math.round(base * factor);
}

/**
 * Cảnh báo giá ngay trên dòng (không popup).
 * @returns {{ level: 'warn' | 'danger', message: string } | null}
 */
export function getLinePriceWarning(line) {
    if (!line || isPromotionLine(line)) return null;

    const costPerUnit = Number(line.costPerUnit) || 0;
    if (costPerUnit <= 0) {
        return {
            level: 'danger',
            message: isTrialLine(line) ? 'Nhập giá thỏa thuận' : 'Nhập đơn giá',
        };
    }

    const unitBase = Number(line.unitBase) > 0 ? Number(line.unitBase) : 1;
    const newCostBase = costPerUnit / unitBase;
    const lastCost = Number(line.lastCostPerBase) || 0;

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
        productCode: product.code || product.sku || product.barcode || `SP${String(product.id).padStart(6, '0')}`,
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

        if (!isValidImportQuantity(quantity)) {
            return `Số lượng của "${line.productName}" phải là số nguyên từ 1 đến ${MAX_IMPORT_QUANTITY.toLocaleString('vi-VN')}.`;
        }

        if (costPerUnit < 0 || Number.isNaN(costPerUnit)) {
            return `Đơn giá của "${line.productName}" không hợp lệ.`;
        }
        if (resolveLineType(line) !== 'PROMOTION' && costPerUnit <= 0) {
            return `Đơn giá của "${line.productName}" chưa nhập.`;
        }
    }

    return null;
}

export function isReceivedStatus(status) {
    return status === IMPORT_ORDER_STATUS.RECEIVED || status === IMPORT_ORDER_STATUS.DONE;
}
