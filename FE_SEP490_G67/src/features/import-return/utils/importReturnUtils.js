export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
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
    const returnPrice = Number(line.returnPrice) || 0;
    return quantity * returnPrice;
}

export function buildReturnSummary(lines) {
    return {
        totalLines: lines.length,
        totalQuantity: lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        totalRefund: lines.reduce((sum, line) => sum + computeLineTotal(line), 0),
    };
}

export function createReturnLineFromProduct(product) {
    return {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productCode: product.productCode || product.code || product.barcode || `SP${product.id}`,
        productName: product.productName || product.name,
        unit: product.unit || 'Cái',
        quantity: 1,
        returnPrice: Number(product.defaultCost ?? product.importPrice ?? product.costPrice ?? 0),
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
    };
}

export function buildCreateReturnPayload({ supplierId, importOrderId, note, lines }) {
    return {
        supplierId: Number(supplierId),
        importOrderId: importOrderId ? Number(importOrderId) : undefined,
        note: note?.trim() || undefined,
        items: lines.map((line) => ({
            productId: Number(line.productId),
            quantity: Number(line.quantity),
            returnPrice: Number(line.returnPrice),
        })),
    };
}

export function validateReturnForm({ supplierId, lines }) {
    if (!supplierId) {
        return 'Vui lòng chọn nhà cung cấp.';
    }

    if (lines.length === 0) {
        return 'Vui lòng thêm ít nhất một sản phẩm vào phiếu trả.';
    }

    for (const line of lines) {
        const quantity = Number(line.quantity);
        const returnPrice = Number(line.returnPrice);

        if (!quantity || quantity <= 0) {
            return `Số lượng trả của "${line.productName}" phải lớn hơn 0.`;
        }

        if (returnPrice < 0 || Number.isNaN(returnPrice)) {
            return `Đơn giá của "${line.productName}" không hợp lệ.`;
        }
    }

    return null;
}
