import { useEffect, useRef } from 'react';
import { api } from '@/lib/api-clien';
import {
    db,
    saveOfflineProducts,
    saveOfflineCustomers,
    saveOfflineDebtOrders,
    saveOfflineSalesOrders,
    saveOfflineSalesOrder,
    cleanupOldSalesOrders
} from '@/lib/db';

const WARMUP_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function useCacheWarmup(authenticated) {
    const warmupRunRef = useRef(false);

    useEffect(() => {
        if (!authenticated || warmupRunRef.current || typeof window === 'undefined') return;
        if (!window.navigator.onLine) return;

        warmupRunRef.current = true;

        const runWarmup = async () => {
            try {
                // Check if we already have fresh products cached (< 4 hours)
                const meta = await db.meta.get('last_warmup_time');
                const lastTime = meta?.value || 0;
                const now = Date.now();
                const productCount = await db.products.count();

                if (productCount > 0 && (now - lastTime < WARMUP_INTERVAL_MS)) {
                    console.info(`[CacheWarmup] Cache is fresh (${productCount} products in DB). Skipping warmup.`);
                    return;
                }

                console.info('[CacheWarmup] Starting lightweight background offline cache warmup...');

                // 1. Warmup store payment info for QR codes (1 request)
                try {
                    await api.get('/store/payment-info');
                } catch (err) {
                    console.warn('[CacheWarmup] Store payment info warmup failed:', err);
                }

                await new Promise(r => setTimeout(r, 400));

                // 2. Warmup entire product catalog (1 single request for all 150-200 items)
                try {
                    const productsRes = await api.get('/products/search', { params: { q: '' } });
                    const products = productsRes?.result || [];
                    if (Array.isArray(products) && products.length > 0) {
                        const count = await saveOfflineProducts(products);
                        await db.meta.put({ key: 'last_product_sync', value: Date.now() });
                        console.info(`[CacheWarmup] Synced ${count} products to offline DB`);
                    }
                } catch (err) {
                    console.warn('[CacheWarmup] Products search warmup failed:', err);
                }

                await new Promise(r => setTimeout(r, 400));

                // 3. Warmup customers (streamlined to 1-2 pages)
                try {
                    const res = await api.get('/customers/debts', { params: { page: 1, size: 100 } });
                    const content = res?.result?.content || [];
                    if (Array.isArray(content) && content.length > 0) {
                        await saveOfflineCustomers(content);
                        await db.meta.put({ key: 'last_customer_sync', value: Date.now() });
                        console.info(`[CacheWarmup] Cached ${content.length} customers to offline DB`);

                        // Prefetch debt orders for top 5 indebted customers only
                        const indebted = content.filter(c =>
                            Number(c.totalDebt ?? c.debtAmount ?? 0) > 0
                        ).slice(0, 5);

                        for (const cust of indebted) {
                            try {
                                const debtOrdersRes = await api.get(`/customers/${cust.id}/debt-orders`, {
                                    params: { size: 50, status: 'IN_DEBT' }
                                });
                                const orders = debtOrdersRes?.result?.content || [];
                                if (orders.length > 0) {
                                    await saveOfflineDebtOrders(cust.id, orders);
                                }
                            } catch (debtErr) {
                                console.warn(`[CacheWarmup] Debt orders prefetch failed for customer ${cust.id}:`, debtErr);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[CacheWarmup] Customers warmup failed:', err);
                }

                await new Promise(r => setTimeout(r, 400));

                // 4. Warmup 7-day sales orders for offline exchange/returns (top 30 orders)
                try {
                    const d7 = new Date();
                    d7.setDate(d7.getDate() - 7);
                    const fromDate = d7.toISOString().slice(0, 10);
                    const toDate = new Date().toISOString().slice(0, 10);

                    const ordersRes = await api.get('/sales-orders', {
                        params: {
                            page: 0,
                            size: 30,
                            dateFrom: fromDate,
                            dateTo: toDate
                        }
                    });
                    const orders = ordersRes?.result?.content || [];
                    if (Array.isArray(orders) && orders.length > 0) {
                        await saveOfflineSalesOrders(orders);

                        // Prefetch exchange details for top 5 recent orders
                        const topOrders = orders.slice(0, 5);
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
                    await cleanupOldSalesOrders(7);
                } catch (err) {
                    console.warn('[CacheWarmup] Failed to warmup sales orders:', err);
                }

                // Record successful warmup
                await db.meta.put({ key: 'last_warmup_time', value: Date.now() });
                console.info('[CacheWarmup] Background offline warmup completed.');
            } catch (err) {
                console.warn('[CacheWarmup] Error during warmup:', err);
            }
        };

        // Delay warmup execution by 3 seconds so critical POS UI loads instantly first
        const timer = setTimeout(runWarmup, 3000);
        return () => clearTimeout(timer);
    }, [authenticated]);
}
