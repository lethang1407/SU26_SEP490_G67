import Dexie from 'dexie';

export const db = new Dexie('SEP490_OfflineDB');

db.version(1).stores({
    // Products table for quick offline POS searches (by barcode, name)
    products: 'id, barcode, name, categoryId, updatedAt',
    // Customers table for offline lookups (by phone, name)
    customers: 'id, phone, name, updatedAt',
    // Queue of offline transactions (sales orders, etc.) to be synced when online
    offline_queue: '++id, clientUuid, type, status, createdAt',
    // Generic HTTP cache for GET requests
    cache_entries: 'url, updatedAt',
    // Key-value metadata store (sync time, cache status, etc.)
    meta: 'key'
});

db.version(2).stores({
    // Add retryAt index for exponential backoff queueing
    offline_queue: '++id, clientUuid, type, status, createdAt, retryAt',
    // Store 7-day sales orders for offline exchange/return and history lookup
    sales_orders: 'id, orderCode, createdAt, customerId'
});

/**
 * Upsert products into offline Dexie database with smart delta tracking
 */
export async function saveOfflineProducts(productsList) {
    if (!Array.isArray(productsList) || productsList.length === 0) return 0;
    const now = Date.now();
    const records = productsList
        .filter(p => p && (p.id != null || p.productId != null))
        .map(p => ({
            id: p.id ?? p.productId,
            barcode: p.barcode || '',
            name: p.name || p.productName || '',
            categoryId: p.categoryId ?? null,
            categoryName: p.categoryName ?? '',
            price: p.price ?? p.retailPrice ?? 0,
            costPrice: p.costPrice ?? 0,
            stockQuantity: p.stockQuantity ?? p.totalQuantity ?? 0,
            unit: p.unit ?? p.baseUnit ?? '',
            units: p.units || [],
            locations: p.locations || [],
            batches: p.batches || [],
            raw: p,
            updatedAt: now
        }));

    await db.products.bulkPut(records);
    return records.length;
}

/**
 * Search products offline by name or keyword
 */
export async function searchOfflineProducts(keyword, limit = 20) {
    if (!keyword?.trim()) return [];
    const lower = keyword.trim().toLowerCase();
    
    return await db.products
        .filter(p => {
            const nameMatch = p.name && p.name.toLowerCase().includes(lower);
            const barcodeMatch = p.barcode && p.barcode.toLowerCase().includes(lower);
            return !!(nameMatch || barcodeMatch);
        })
        .limit(limit)
        .toArray();
}

/**
 * Find a product offline by exact barcode
 */
export async function getOfflineProductByBarcode(barcode) {
    if (!barcode?.trim()) return null;
    const code = barcode.trim();
    const found = await db.products.where('barcode').equals(code).first();
    if (found) return found.raw || found;
    // Fallback: case insensitive match
    const lower = code.toLowerCase();
    const fallback = await db.products.filter(p => p.barcode && p.barcode.toLowerCase() === lower).first();
    return fallback ? (fallback.raw || fallback) : null;
}

/**
 * Upsert customers into offline Dexie database
 */
export async function saveOfflineCustomers(customersList) {
    if (!Array.isArray(customersList) || customersList.length === 0) return;
    const now = Date.now();
    const records = customersList
        .filter(c => c && (c.id != null || c.customerId != null))
        .map(c => ({
            id: c.id ?? c.customerId,
            phone: c.phone || '',
            name: c.name || c.customerName || '',
            debtAmount: c.debtAmount ?? c.currentDebt ?? 0,
            maxDebtLimit: c.maxDebtLimit ?? 0,
            raw: c,
            updatedAt: now
        }));

    await db.customers.bulkPut(records);
}

/**
 * Search customers offline by phone or name
 */
export async function searchOfflineCustomers(keyword, limit = 10) {
    if (!keyword?.trim()) return [];
    const lower = keyword.trim().toLowerCase();

    return await db.customers
        .filter(c => {
            const phoneMatch = c.phone && c.phone.toLowerCase().includes(lower);
            const nameMatch = c.name && c.name.toLowerCase().includes(lower);
            return !!(phoneMatch || nameMatch);
        })
        .limit(limit)
        .toArray();
}

/**
 * Get customer by exact phone number
 */
export async function getOfflineCustomerByPhone(phone) {
    if (!phone?.trim()) return null;
    const target = phone.trim();
    const found = await db.customers.where('phone').equals(target).first();
    return found ? (found.raw || found) : null;
}

/**
 * Queue an offline order for future sync
 */
export async function enqueueOfflineOrder(orderData) {
    const record = {
        clientUuid: orderData.clientUuid || `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: orderData.type || 'SALES_ORDER',
        status: 'PENDING', // PENDING | SYNCING | SYNCED | FAILED
        payload: orderData.payload,
        orderSnapshot: orderData.orderSnapshot,
        customer: orderData.customer,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        retryAt: null,
        errorMsg: null,
    };
    const id = await db.offline_queue.add(record);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
    return { ...record, id };
}

/**
 * Get all pending offline orders
 */
export async function getPendingOfflineOrders() {
    return await db.offline_queue
        .where('status')
        .anyOf(['PENDING', 'FAILED'])
        .toArray();
}

/**
 * Update offline queue item status with optional retry info
 */
export async function updateOfflineOrderStatus(id, status, errorMsg = null, extraFields = {}) {
    await db.offline_queue.update(id, {
        status,
        errorMsg,
        ...extraFields,
        updatedAt: new Date().toISOString()
    });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
    }
}

/**
 * Save sales orders to offline store (e.g. 7-day orders)
 */
export async function saveOfflineSalesOrders(ordersList) {
    if (!Array.isArray(ordersList) || ordersList.length === 0) return;
    const now = Date.now();
    const records = ordersList
        .filter(o => o && (o.id != null || o.orderId != null))
        .map(o => {
            const id = o.id ?? o.orderId;
            const customer = o.customer || (o.customerName ? {
                id: o.customerId,
                fullName: o.customerName,
                phoneNumber: o.customerPhone
            } : null);

            return {
                id,
                orderCode: o.orderCode || `HD${id}`,
                createdAt: o.createdAt || new Date().toISOString(),
                customer,
                customerId: customer?.id ?? null,
                customerName: customer?.fullName || o.customerName || 'Khách lẻ',
                customerPhone: customer?.phoneNumber || o.customerPhone || '',
                totalAmount: o.totalAmount ?? 0,
                paymentMethod: o.paymentMethod || 'CASH',
                orderStatus: o.orderStatus || 'COMPLETED',
                isDebt: Boolean(o.isDebt),
                dueDate: o.dueDate || null,
                paidAmount: o.paidAmount ?? 0,
                debtRemaining: o.debtRemaining ?? o.remainingDebt ?? 0,
                debtStatus: o.debtStatus || (o.isDebt ? 'UNPAID' : 'NONE'),
                items: Array.isArray(o.items) ? o.items : [],
                exchangeDetail: o.exchangeDetail || null,
                relatedDocuments: o.relatedDocuments || [],
                staffName: o.staffName || '',
                updatedAt: now
            };
        });

    await db.sales_orders.bulkPut(records);
}

/**
 * Save single sales order or update its detail
 */
export async function saveOfflineSalesOrder(order) {
    if (!order) return;
    await saveOfflineSalesOrders([order]);
}

/**
 * Get offline sales order by ID or orderCode
 */
export async function getOfflineSalesOrder(orderIdOrCode) {
    if (orderIdOrCode == null) return null;
    const numId = Number(orderIdOrCode);
    let order = null;
    if (!isNaN(numId)) {
        order = await db.sales_orders.get(numId);
    }
    if (!order && typeof orderIdOrCode === 'string') {
        order = await db.sales_orders.where('orderCode').equals(orderIdOrCode.trim()).first();
    }
    return order || null;
}

/**
 * Get filtered sales orders for offline history display
 */
export async function getOfflineSalesOrders({
    page = 0,
    size = 10,
    search = '',
    dateFrom,
    dateTo
} = {}) {
    let collection = db.sales_orders.toCollection();

    let all = await collection.toArray();
    // Filter by date range if provided
    if (dateFrom || dateTo) {
        all = all.filter(o => {
            if (!o.createdAt) return false;
            const dateStr = o.createdAt.slice(0, 10);
            if (dateFrom && dateStr < dateFrom) return false;
            if (dateTo && dateStr > dateTo) return false;
            return true;
        });
    }

    // Filter by search keyword (orderCode, customerName, customerPhone)
    if (search?.trim()) {
        const q = search.trim().toLowerCase();
        all = all.filter(o =>
            (o.orderCode && o.orderCode.toLowerCase().includes(q)) ||
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.customerPhone && o.customerPhone.includes(q))
        );
    }

    // Sort newest first
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalElements = all.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const content = all.slice(start, start + size);

    return {
        content,
        totalElements,
        totalPages,
        page,
        size
    };
}

/**
 * Cleanup orders older than specified days (default 7 days)
 */
export async function cleanupOldSalesOrders(days = 7) {
    try {
        const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
        const cutoffIso = new Date(cutoffTime).toISOString();
        const oldOrders = await db.sales_orders
            .filter(o => o.createdAt && o.createdAt < cutoffIso)
            .toArray();

        if (oldOrders.length > 0) {
            const oldIds = oldOrders.map(o => o.id);
            await db.sales_orders.bulkDelete(oldIds);
            console.info(`[Cleanup] Removed ${oldIds.length} sales orders older than ${days} days`);
        }
    } catch (err) {
        console.warn('[Cleanup] Failed to cleanup old sales orders:', err);
    }
}

