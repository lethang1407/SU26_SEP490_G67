import { INVENTORY_STATUS } from '../constants';

const DEFAULT_MIN_STOCK = 50;

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

export function mapInventoryProduct(product) {
    const stock = Number(product.stock) || 0;
    const importPrice = Number(product.importPrice) || 0;
    const minStock =
        Number(product.minStock) > 0 ? Number(product.minStock) : DEFAULT_MIN_STOCK;

    return {
        ...product,
        stock,
        importPrice,
        minStock,
        inventoryValue: stock * importPrice,
        inventoryStatus: resolveInventoryStatus(stock, minStock),
    };
}

export function resolveInventoryStatus(stock, minStock) {
    if (stock === 0) {
        return INVENTORY_STATUS.OUT_OF_STOCK;
    }

    if (stock > minStock * 2) {
        return INVENTORY_STATUS.OVERSTOCK;
    }

    if (stock < minStock) {
        return INVENTORY_STATUS.LOW_STOCK;
    }

    return INVENTORY_STATUS.IN_STOCK;
}

export function getStockProgress(stock, minStock) {
    const capacity = Math.max(minStock, stock, 1);
    const percent = Math.min(100, Math.round((stock / capacity) * 100));

    return { capacity, percent };
}

export function buildInventorySummary(products) {
    const mapped = products.map(mapInventoryProduct);

    return {
        totalProducts: mapped.length,
        expiredProducts: 0,
        inventoryValue: mapped.reduce((sum, item) => sum + item.inventoryValue, 0),
        lowStockCount: mapped.filter((item) => item.inventoryStatus === INVENTORY_STATUS.LOW_STOCK)
            .length,
    };
}

export function filterInventoryProducts(products, { keyword, categoryFilter, statusFilter }) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products.filter((product) => {
        const mapped = mapInventoryProduct(product);

        const matchesKeyword =
            !normalizedKeyword ||
            mapped.name?.toLowerCase().includes(normalizedKeyword) ||
            mapped.code?.toLowerCase().includes(normalizedKeyword) ||
            mapped.barcode?.includes(normalizedKeyword);

        const matchesCategory =
            categoryFilter === 'all' || mapped.category === categoryFilter;

        const matchesStatus =
            statusFilter === INVENTORY_STATUS.ALL ||
            mapped.inventoryStatus === statusFilter;

        return matchesKeyword && matchesCategory && matchesStatus;
    });
}
