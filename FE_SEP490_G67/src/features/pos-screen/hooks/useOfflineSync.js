import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { db, updateOfflineOrderStatus, saveOfflineSalesOrder, revertOptimisticCustomerDebt } from '@/lib/db';
import { createInvoice, createDebtInvoice, processExchangeOrder } from '../api';
import { createDebtPayment } from '../../customer/api';

export function useOfflineSync() {
    const { isOnline } = useOnlineStatus();
    const [queue, setQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState(null);
    const syncLockRef = useRef(false);

    // Refresh queue from DB
    const refreshQueue = useCallback(async () => {
        try {
            const allItems = await db.offline_queue.toArray();
            // Sort strictly by createdAt ascending (FIFO: Oldest first -> Newest last)
            allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setQueue(allItems);
            return allItems;
        } catch (err) {
            console.warn('[OfflineSync] Failed to read queue:', err);
            return [];
        }
    }, []);

    // Perform sync of pending items with exponential backoff & FIFO integrity
    const syncNow = useCallback(async () => {
        if (!isOnline || syncLockRef.current) return;
        syncLockRef.current = true;
        setIsSyncing(true);

        const currentQueue = await refreshQueue();
        const pendingItems = currentQueue.filter(it => it.status === 'PENDING' || it.status === 'FAILED');

        if (pendingItems.length === 0) {
            setIsSyncing(false);
            syncLockRef.current = false;
            return;
        }

        // CRITICAL: Sort strictly by createdAt ascending (FIFO: Oldest first -> Newest last)
        // Guarantees all orders and exchange/returns commit in their true chronological sequence
        pendingItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Respect exponential backoff window: if the oldest pending item is still waiting for its retryAt,
        // we must wait for it to preserve FIFO sequence.
        const now = Date.now();
        const headItem = pendingItems[0];
        if (headItem.retryAt && new Date(headItem.retryAt).getTime() > now) {
            setIsSyncing(false);
            syncLockRef.current = false;
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const item of pendingItems) {
            // Check if this item is still waiting for its retryAt
            if (item.retryAt && new Date(item.retryAt).getTime() > Date.now()) {
                break; // Do not process subsequent items until this item is ready
            }

            try {
                await updateOfflineOrderStatus(item.id, 'SYNCING');

                let result;
                if (item.type === 'EXCHANGE') {
                    result = await processExchangeOrder(item.payload);
                } else if (item.type === 'DEBT') {
                    result = await createDebtInvoice(item.payload);
                } else if (item.type === 'DEBT_PAYMENT') {
                    result = await createDebtPayment(item.payload);
                } else {
                    result = await createInvoice(item.payload);
                }

                // Once synced to server, delete from local offline queue
                await db.offline_queue.delete(item.id);

                // Save synced order into offline sales_orders store
                if (result && (result.id || result.orderId)) {
                    try {
                        await saveOfflineSalesOrder({
                            ...result,
                            exchangeDetail: item.type === 'EXCHANGE' ? result : null,
                            items: result.items || []
                        });
                    } catch (cacheErr) {
                        console.warn('[OfflineSync] Failed to save synced order to offline cache:', cacheErr);
                    }
                }

                successCount++;
            } catch (err) {
                console.error(`[OfflineSync] Sync failed for queue item ${item.id} (${item.type}):`, err);
                const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error');
                if (isNetworkError) {
                    // Exponential backoff schedule: lần 1: 5s, lần 2: 15s, lần 3: 30s, lần 4+: 60s
                    const BACKOFF = [5, 15, 30, 60];
                    const nextCount = (item.retryCount ?? 0) + 1;
                    const delaySec = BACKOFF[Math.min(nextCount - 1, BACKOFF.length - 1)];
                    const retryAt = new Date(Date.now() + delaySec * 1000).toISOString();

                    await updateOfflineOrderStatus(item.id, 'PENDING', null, {
                        retryCount: nextCount,
                        retryAt
                    });
                    // Stop syncing remaining items immediately to preserve FIFO integrity!
                    break;
                } else {
                    // Server business / validation error (e.g. out of stock)
                    const errorMsg = err.response?.data?.message || err.message || 'Lỗi dữ liệu từ máy chủ';
                    await updateOfflineOrderStatus(item.id, 'FAILED', errorMsg, { retryAt: null });
                    failCount++;
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-queue-changed'));
        }
        await refreshQueue();
        setLastSyncResult({ successCount, failCount, timestamp: Date.now() });
        setIsSyncing(false);
        syncLockRef.current = false;
    }, [isOnline, refreshQueue]);

    // Initial load, periodic refresh, and instant event listener
    useEffect(() => {
        refreshQueue();
        const interval = setInterval(() => {
            refreshQueue();
            if (isOnline && !syncLockRef.current) {
                syncNow();
            }
        }, 3000);

        const onQueueChanged = () => {
            refreshQueue();
            if (isOnline && !syncLockRef.current) {
                syncNow();
            }
        };

        window.addEventListener('offline-queue-changed', onQueueChanged);
        return () => {
            clearInterval(interval);
            window.removeEventListener('offline-queue-changed', onQueueChanged);
        };
    }, [refreshQueue, isOnline, syncNow]);

    const removeQueueItem = useCallback(async (id) => {
        try {
            const item = await db.offline_queue.get(id);
            if (item && item.type === 'DEBT_PAYMENT') {
                const custId = item.customer?.id || item.orderSnapshot?.customerId;
                const amount = item.payload?.amountPaid || item.orderSnapshot?.amountPaid || 0;
                const orderIds = item.payload?.salesOrderIds || item.orderSnapshot?.selectedOrderIds || [];
                if (custId && amount > 0) {
                    await revertOptimisticCustomerDebt(custId, amount, orderIds);
                }
            }
            await db.offline_queue.delete(id);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('offline-queue-changed'));
            }
            await refreshQueue();
        } catch (err) {
            console.error('[OfflineSync] Failed to delete queue item:', err);
        }
    }, [refreshQueue]);

    const clearSynced = useCallback(async () => {
        try {
            await db.offline_queue.where('status').equals('SYNCED').delete();
            await refreshQueue();
        } catch (err) {
            console.error('[OfflineSync] Failed to clear synced items:', err);
        }
    }, [refreshQueue]);

    const pendingCount = queue.filter(it => it.status === 'PENDING' || it.status === 'FAILED').length;
    const failedCount = queue.filter(it => it.status === 'FAILED').length;

    return {
        queue,
        pendingCount,
        failedCount,
        isSyncing,
        lastSyncResult,
        syncNow,
        removeQueueItem,
        clearSynced,
        refreshQueue
    };
}
