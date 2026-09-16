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

db.version(3).stores({
    // Store customer debt orders for offline debt collection
    debt_orders: 'id, customerId, orderId, orderCode, status'
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
 * Upsert customers into offline Dexie database with full customer details
 */
export async function saveOfflineCustomers(customersList) {
    if (!Array.isArray(customersList) || customersList.length === 0) return 0;
    const now = Date.now();
    const records = customersList
        .filter(c => c && (c.id != null || c.customerId != null))
        .map(c => {
            const id = c.id ?? c.customerId;
            const phone = c.phoneNumber || c.phone || '';
            const name = c.fullName || c.name || c.customerName || '';
            const totalDebt = Number(c.totalDebt ?? c.debtAmount ?? c.currentDebt ?? 0);
            return {
                id,
                phone,
                name,
                fullName: name,
                phoneNumber: phone,
                address: c.address || '',
                debtAmount: totalDebt,
                totalDebt,
                debtStatus: c.debtStatus || (totalDebt > 0 ? 'IN_DEBT' : 'NO_DEBT'),
                allowDebt: c.allowDebt !== undefined ? Boolean(c.allowDebt) : true,
                latestDebtDate: c.latestDebtDate || null,
                note: c.note || '',
                isOverdue: Boolean(c.isOverdue || c.debtStatus === 'OVERDUE'),
                isCheckDebtUnstable: Boolean(c.isCheckDebtUnstable),
                totalOrdersInDebt: Number(c.totalOrdersInDebt ?? 0),
                totalOverdueOrders: Number(c.totalOverdueOrders ?? 0),
                maxDebtLimit: Number(c.maxDebtLimit ?? 0),
                raw: { ...c, id, phone, name, fullName: name, phoneNumber: phone, totalDebt, debtAmount: totalDebt },
                updatedAt: now
            };
        });

    await db.customers.bulkPut(records);
    return records.length;
}

/**
 * Search customers offline by phone or name (returns full normalized objects)
 */
export async function searchOfflineCustomers(keyword, limit = 20) {
    if (!keyword?.trim()) return [];
    const lower = keyword.trim().toLowerCase();

    const items = await db.customers
        .filter(c => {
            const phoneMatch = (c.phone && c.phone.toLowerCase().includes(lower)) ||
                               (c.phoneNumber && c.phoneNumber.toLowerCase().includes(lower));
            const nameMatch = (c.name && c.name.toLowerCase().includes(lower)) ||
                              (c.fullName && c.fullName.toLowerCase().includes(lower));
            return !!(phoneMatch || nameMatch);
        })
        .limit(limit)
        .toArray();

    return items.map(c => ({
        ...(c.raw || {}),
        ...c,
        id: c.id,
        fullName: c.fullName || c.name,
        phoneNumber: c.phoneNumber || c.phone,
        totalDebt: Number(c.totalDebt ?? c.debtAmount ?? 0),
        debtAmount: Number(c.totalDebt ?? c.debtAmount ?? 0)
    }));
}

/**
 * Get customer by exact phone number
 */
export async function getOfflineCustomerByPhone(phone) {
    if (!phone?.trim()) return null;
    const target = phone.trim();
    let found = await db.customers.where('phone').equals(target).first();
    if (!found) {
        found = await db.customers.filter(c => (c.phoneNumber === target || c.phone === target)).first();
    }
    if (!found) return null;
    return {
        ...(found.raw || {}),
        ...found,
        id: found.id,
        fullName: found.fullName || found.name,
        phoneNumber: found.phoneNumber || found.phone,
        totalDebt: Number(found.totalDebt ?? found.debtAmount ?? 0),
        debtAmount: Number(found.totalDebt ?? found.debtAmount ?? 0)
    };
}

/**
 * Get filtered customers for offline CustomerDebtModal
 */
export async function getOfflineCustomerDebts({
    keyword = '',
    status,
    allowDebt,
    fromDate,
    toDate,
    page = 1,
    size = 10,
    sortBy = 'debtPriorityLatest'
} = {}) {
    let all = await db.customers.toArray();

    all = all.map(c => ({
        ...(c.raw || {}),
        ...c,
        id: c.id,
        fullName: c.fullName || c.name,
        phoneNumber: c.phoneNumber || c.phone,
        totalDebt: Number(c.totalDebt ?? c.debtAmount ?? 0),
        debtAmount: Number(c.totalDebt ?? c.debtAmount ?? 0)
    }));

    // Keyword filter
    if (keyword?.trim()) {
        const lower = keyword.trim().toLowerCase();
        all = all.filter(c =>
            (c.fullName && c.fullName.toLowerCase().includes(lower)) ||
            (c.phoneNumber && c.phoneNumber.toLowerCase().includes(lower))
        );
    }

    // Status filter: IN_DEBT, OVERDUE, NO_DEBT
    if (status) {
        if (status === 'IN_DEBT') {
            all = all.filter(c => c.debtStatus === 'IN_DEBT' || (c.totalDebt > 0 && c.debtStatus !== 'OVERDUE'));
        } else if (status === 'OVERDUE') {
            all = all.filter(c => c.debtStatus === 'OVERDUE' || c.isOverdue === true);
        } else if (status === 'NO_DEBT') {
            all = all.filter(c => c.debtStatus === 'NO_DEBT' || c.totalDebt === 0);
        }
    }

    // AllowDebt filter: 'true' / 'false'
    if (allowDebt !== undefined && allowDebt !== '') {
        const isAllow = String(allowDebt) === 'true';
        all = all.filter(c => Boolean(c.allowDebt) === isAllow);
    }

    // Date range filter based on latestDebtDate
    if (fromDate || toDate) {
        all = all.filter(c => {
            if (!c.latestDebtDate) return false;
            const dateStr = String(c.latestDebtDate).slice(0, 10);
            if (fromDate && dateStr < fromDate) return false;
            if (toDate && dateStr > toDate) return false;
            return true;
        });
    }

    // Sorting: default debtPriorityLatest (debt > 0 first, then newest latestDebtDate)
    all.sort((a, b) => {
        if (b.totalDebt !== a.totalDebt) {
            return (b.totalDebt > 0 ? 1 : 0) - (a.totalDebt > 0 ? 1 : 0) || (b.totalDebt - a.totalDebt);
        }
        const tA = a.latestDebtDate ? new Date(a.latestDebtDate).getTime() : 0;
        const tB = b.latestDebtDate ? new Date(b.latestDebtDate).getTime() : 0;
        return tB - tA;
    });

    const totalElements = all.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const start = Math.max(0, (page - 1) * size);
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
 * Save customer debt orders to offline debt_orders store
 */
export async function saveOfflineDebtOrders(customerId, ordersList) {
    if (!customerId || !Array.isArray(ordersList) || ordersList.length === 0) return;
    const now = Date.now();
    const records = ordersList
        .filter(o => o && (o.id != null || o.orderId != null))
        .map(o => ({
            id: o.id ?? o.orderId,
            customerId: Number(customerId),
            orderId: o.orderId ?? o.id,
            orderCode: o.orderCode || `#${o.orderId || o.id}`,
            orderDate: o.orderDate || o.createdAt || new Date().toISOString(),
            dueDate: o.dueDate || null,
            totalAmount: Number(o.totalAmount ?? 0),
            amountPaid: Number(o.amountPaid ?? 0),
            amountRemaining: Number(o.amountRemaining ?? o.debtRemaining ?? 0),
            status: o.status || (Number(o.amountRemaining ?? 0) > 0 ? 'IN_DEBT' : 'PAID'),
            createdBy: o.createdBy || '',
            raw: o,
            updatedAt: now
        }));

    await db.debt_orders.bulkPut(records);
}

/**
 * Get offline debt orders for a customer
 */
export async function getOfflineDebtOrders(customerId) {
    if (!customerId) return { content: [], totalElements: 0, totalPages: 0 };
    const numId = Number(customerId);
    let orders = await db.debt_orders.where('customerId').equals(numId).toArray();

    // If debt_orders table doesn't have it, fallback to db.sales_orders for this customer
    if (orders.length === 0) {
        const salesOrders = await db.sales_orders.where('customerId').equals(numId).toArray();
        orders = salesOrders
            .filter(so => so.isDebt || Number(so.debtRemaining || 0) > 0)
            .map(so => ({
                id: so.id,
                customerId: numId,
                orderId: so.id,
                orderCode: so.orderCode,
                orderDate: so.createdAt,
                dueDate: so.dueDate,
                totalAmount: so.totalAmount,
                amountPaid: so.paidAmount,
                amountRemaining: so.debtRemaining,
                status: so.debtStatus || 'IN_DEBT',
                createdBy: so.staffName || ''
            }));
    }

    orders = orders.filter(o => Number(o.amountRemaining) > 0);
    orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return {
        content: orders,
        totalElements: orders.length,
        totalPages: Math.max(1, Math.ceil(orders.length / 10))
    };
}

/**
 * Optimistically update customer debt in Dexie after offline debt collection
 */
export async function optimisticallyUpdateCustomerDebt(customerId, amountPaid, selectedOrderIds = []) {
    if (!customerId || !amountPaid || amountPaid <= 0) return;
    const numId = Number(customerId);
    const paid = Number(amountPaid);

    // 1. Update customer total debt in db.customers
    const customer = await db.customers.get(numId);
    if (customer) {
        const prevDebt = Number(customer.totalDebt ?? customer.debtAmount ?? 0);
        const newDebt = Math.max(0, prevDebt - paid);
        const newDebtStatus = newDebt <= 0 ? 'NO_DEBT' : (customer.debtStatus || 'IN_DEBT');
        const ordersInDebt = Number(customer.totalOrdersInDebt ?? 0);
        const newOrdersInDebt = newDebt <= 0 ? 0 : Math.max(0, ordersInDebt - (selectedOrderIds.length > 0 ? 1 : 0));

        await db.customers.update(numId, {
            totalDebt: newDebt,
            debtAmount: newDebt,
            debtStatus: newDebtStatus,
            totalOrdersInDebt: newOrdersInDebt,
            updatedAt: Date.now()
        });
    }

    // 2. Sequentially reduce amountRemaining on selected debt orders in db.debt_orders
    if (Array.isArray(selectedOrderIds) && selectedOrderIds.length > 0) {
        let remainingToDeduct = paid;
        for (const orderId of selectedOrderIds) {
            if (remainingToDeduct <= 0) break;
            const debtOrder = await db.debt_orders.get(orderId);
            if (debtOrder) {
                const curRemaining = Number(debtOrder.amountRemaining || 0);
                const deduction = Math.min(curRemaining, remainingToDeduct);
                const newRemaining = curRemaining - deduction;
                const newPaid = Number(debtOrder.amountPaid || 0) + deduction;
                const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIALLY_PAID';

                await db.debt_orders.update(orderId, {
                    amountRemaining: newRemaining,
                    amountPaid: newPaid,
                    status: newStatus,
                    updatedAt: Date.now()
                });
                remainingToDeduct -= deduction;
            }
        }
    }
}

/**
 * Revert optimistic customer debt if offline debt collection item is removed from queue
 */
export async function revertOptimisticCustomerDebt(customerId, amountPaid, selectedOrderIds = []) {
    if (!customerId || !amountPaid || amountPaid <= 0) return;
    const numId = Number(customerId);
    const paid = Number(amountPaid);

    const customer = await db.customers.get(numId);
    if (customer) {
        const curDebt = Number(customer.totalDebt ?? customer.debtAmount ?? 0);
        const restoredDebt = curDebt + paid;
        await db.customers.update(numId, {
            totalDebt: restoredDebt,
            debtAmount: restoredDebt,
            debtStatus: 'IN_DEBT',
            updatedAt: Date.now()
        });
    }
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

