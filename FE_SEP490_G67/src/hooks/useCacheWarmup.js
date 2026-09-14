import { useEffect, useRef } from 'react';
import { api } from '@/lib/api-clien';
import {
    db,
    saveOfflineProducts,
    saveOfflineCustomers,
    saveOfflineSalesOrders,
    saveOfflineSalesOrder,
    cleanupOldSalesOrders
} from '@/lib/db';

const WARMUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useCacheWarmup(authenticated) {
    const warmupRunRef = useRef(false);

    useEffect(() => {
        if (!authenticated || warmupRunRef.current || typeof window === 'undefined') return;
        if (!window.navigator.onLine) return;

        warmupRunRef.current = true;

        const runWarmup = async () => {
            try {
                // Check last warmup timestamp
                const meta = await db.meta.get('last_warmup_time');
                const lastTime = meta?.value || 0;
                const now = Date.now();

                if (now - lastTime < WARMUP_INTERVAL_MS) {
                    return;
                }

                console.info('[CacheWarmup] Starting background offline cache warmup...');

                // 1. Warmup store payment info for QR codes
                try {
                    await api.get('/store/payment-info');
                } catch (err) {
                    console.warn('[CacheWarmup] Store payment info warmup failed:', err);
                }

                // Small pause to avoid network congestion
                await new Promise(r => setTimeout(r, 600));

                // 2. Warmup product catalog (delta sync & upsert)
                try {
                    const productsRes = await api.get('/products/search', { params: { q: '' } });
                    const products = productsRes?.result || [];
                    if (Array.isArray(products) && products.length > 0) {
                        const count = await saveOfflineProducts(products);
                        await db.meta.put({ key: 'last_product_sync', value: Date.now() });
                        console.info(`[CacheWarmup] Delta synced ${count} products to offline DB`);
                    }
                } catch (err) {
                    console.warn('[CacheWarmup] Products search warmup failed, trying suggestions fallback:', err);
                    // Fallback to import suggestions endpoint if search requires min query
                    try {
                        const sugRes = await api.get('/import/suggestions', { params: { size: 100 } });
                        const items = sugRes?.result?.content || [];
                        if (Array.isArray(items) && items.length > 0) {
                            await saveOfflineProducts(items);
                            await db.meta.put({ key: 'last_product_sync', value: Date.now() });
                            console.info(`[CacheWarmup] Cached ${items.length} products via suggestions`);
                        }
                    } catch (fallbackErr) {
                        console.warn('[CacheWarmup] Product suggestions fallback warmup failed:', fallbackErr);
                    }
                }

                // Small pause
                await new Promise(r => setTimeout(r, 600));

                // 3. Warmup customer list
                try {
                    const customersRes = await api.get('/customers/debts', { params: { page: 1, size: 100 } });
                    const customers = customersRes?.result?.content || [];
                    if (Array.isArray(customers) && customers.length > 0) {
                        await saveOfflineCustomers(customers);
                        console.info(`[CacheWarmup] Cached ${customers.length} customers`);
                    }
                } catch (err) {
                    console.warn('[CacheWarmup] Customers warmup failed:', err);
                }

                // Small pause
                await new Promise(r => setTimeout(r, 600));

                // 4. Warmup 7-day sales orders for offline exchange/returns
                try {
                    const d7 = new Date();
                    d7.setDate(d7.getDate() - 7);
                    const fromDate = d7.toISOString().slice(0, 10);
                    const toDate = new Date().toISOString().slice(0, 10);

                    const ordersRes = await api.get('/sales-orders', {
                        params: {
                            page: 0,
                            size: 50,
                            dateFrom: fromDate,
                            dateTo: toDate
                        }
                    });
                    const orders = ordersRes?.result?.content || [];
                    if (Array.isArray(orders) && orders.length > 0) {
                        await saveOfflineSalesOrders(orders);
                        console.info(`[CacheWarmup] Cached ${orders.length} recent sales orders`);

                        // Prefetch exchange details for top recent orders so exchange/return is instant offline
                        const topOrders = orders.slice(0, 15);
                        for (const ord of topOrders) {
                            try {
                                const exRes = await api.get(`/sales-orders/${ord.id}/exchange`);
                                if (exRes?.result) {
                                    await saveOfflineSalesOrder({
                                        ...ord,
                                        ...exRes.result,
                                        exchangeDetail: exRes.result,
                                        items: exRes.result.items || []
                                    });
                                }
                            } catch (ordErr) {
                                console.warn(`[CacheWarmup] Failed to prefetch exchange detail for order ${ord.id}:`, ordErr);
                            }
                        }
                    }
                    // Clean up any orders older than 7 days to free space
                    await cleanupOldSalesOrders(7);
                } catch (err) {
                    console.warn('[CacheWarmup] Failed to warmup sales orders:', err);
                }

                // Record successful warmup
                await db.meta.put({ key: 'last_warmup_time', value: Date.now() });
                console.info('[CacheWarmup] Finished background cache warmup successfully.');
            } catch (err) {
                console.warn('[CacheWarmup] Error during warmup:', err);
            }
        };

        // Delay warmup execution by 3 seconds so critical page requests finish first
        const timer = setTimeout(runWarmup, 3000);
        return () => clearTimeout(timer);
    }, [authenticated]);
}
