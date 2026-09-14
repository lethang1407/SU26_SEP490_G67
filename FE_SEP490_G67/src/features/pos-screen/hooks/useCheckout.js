import { useState, useCallback } from 'react';
import { getCustomerByPhone, createInvoice, createDebtInvoice, getInvoiceData } from '../api';
import { hasLocationProblem, toStockPicks } from '../utils/cartLocation';
import { debtBlockReason } from '../utils/debtStatus';

function endOfDayIso(dateStr) {
    return new Date(`${dateStr}T23:59:59+07:00`).toISOString();
}


import { getOfflineCustomerByPhone, saveOfflineCustomers, enqueueOfflineOrder, saveOfflineSalesOrder } from '@/lib/db';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { showOfflineToast } from '../components/OfflineToast';

function generateOfflineOrderCode() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(100000 + Math.random() * 900000);
    return `HDO${datePart}_${randPart}`;
}

export function useCheckout() {
    const { isOnline } = useOnlineStatus();
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [invoiceType, setInvoiceType] = useState(null); // null | 'found' | 'not_found'
    const [discount, setDiscount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const lookupCustomer = useCallback(async (phoneValue) => {
        setError(null);
        try {
            const found = await getCustomerByPhone(phoneValue);
            if (found) {
                setCustomer(found);
                setInvoiceType('found');
                saveOfflineCustomers([found]).catch((cacheErr) => {
                    console.warn("[useCheckout] Failed to cache customer:", cacheErr);
                });
            } else {
                setCustomer(null);
                setInvoiceType('not_found');
            }
            return found;
        } catch (error) {
            console.warn("[useCheckout] Online customer lookup failed, falling back to offline cache:", error);
            // Offline fallback
            try {
                const offlineCustomer = await getOfflineCustomerByPhone(phoneValue);
                if (offlineCustomer) {
                    setCustomer(offlineCustomer);
                    setInvoiceType('found');
                    return offlineCustomer;
                }
            } catch (dbErr) {
                console.error("[useCheckout] Offline customer lookup error:", dbErr);
            }

            setError('Lỗi tra cứu khách hàng. Vui lòng thử lại.');
            return null;
        }
    }, []);

    const attachCustomer = useCallback((customerObj) => {
        setCustomer(customerObj);
        setInvoiceType('found');
        setPhone('');
    }, []);

    const detachCustomer = useCallback(() => {
        setCustomer(null);
        setInvoiceType(null);
        setPhone('');
        setError(null);
    }, []);

    const validateCheckout = useCallback((cartItems, paymentMethod, debtInfo) => {
        if (!cartItems || cartItems.length === 0) {
            return 'Giỏ hàng trống. Vui lòng thêm sản phẩm.';
        }

        const isOnline = typeof window === 'undefined' ? true : window.navigator.onLine;
        if (isOnline) {
            const badLine = cartItems.find(hasLocationProblem);
            if (badLine) {
                return `"${badLine.name}": chưa chọn vị trí lấy hàng hoặc các vị trí đã chọn không đủ số lượng.`;
            }
        }

        // Debt orders must have an attached customer
        if (paymentMethod === 'debt') {
            if (!customer) {
                return 'Đơn nợ phải có thông tin khách hàng. Vui lòng tìm hoặc thêm khách hàng.';
            }
            const blockReason = debtBlockReason(customer);
            if (blockReason) return blockReason;
            if (!debtInfo?.dueDate) return 'Vui lòng chọn hạn trả nợ.';
        }

        return null;
    }, [customer]);

    /** request tạo đơn. */
    const buildOrderPayload = useCallback((cartItems, paymentMethod, debtInfo, note, paymentReference) => {
        const discountAmount = discount > 0 ? discount : 0;
        return {
            paymentMethod: paymentMethod.toUpperCase(),
            discountAmount,
            note: note?.trim() ? note.trim() : null,
            items: cartItems.map((item) => ({
                productId: item.productId,
                picks: toStockPicks(item),
                productUnitId: item.productUnitId,
                quantity: item.qty,
                unitPrice: item.price,
            })),

            ...(customer?.id ? { customerId: customer.id } : {}),
            ...(paymentReference ? { paymentReference } : {}),
            ...(paymentMethod === 'debt' ? {
                paidAmount: debtInfo.paidAmount ?? 0,
                dueDate: endOfDayIso(debtInfo.dueDate),
            } : {}),
        };
    }, [discount, customer]);

    /**
     * Ghi sổ đơn.
     */
    const submitCheckout = useCallback(async (cartItems, paymentMethod, debtInfo, note, paymentReference) => {
        const validationError = validateCheckout(cartItems, paymentMethod, debtInfo);
        if (validationError) {
            setError(validationError);
            return { ok: false, error: validationError };
        }

        setSubmitting(true);
        setError(null);

        const buildOfflineInvoice = (offlineUuid, offlineCode) => {
            const subtotal = cartItems.reduce((acc, it) => acc + ((it.price || 0) * (it.qty || 1)), 0);
            const discountVal = discount > 0 ? discount : 0;
            const totalAmount = Math.max(0, subtotal - discountVal);

            return {
                id: offlineUuid,
                orderCode: offlineCode,
                isOffline: true,
                paymentMethod: paymentMethod.toUpperCase(),
                totalAmount,
                discountAmount: discountVal,
                finalAmount: totalAmount,
                note: note || '',
                createdAt: new Date().toISOString(),
                customer: customer ? {
                    id: customer.id,
                    fullName: customer.name || customer.fullName,
                    phoneNumber: customer.phone || customer.phoneNumber
                } : null,
                items: cartItems.map(it => ({
                    productId: it.productId,
                    productName: it.name,
                    unitName: it.unit || 'Cái',
                    quantity: it.qty,
                    unitPrice: it.price || 0,
                    totalPrice: (it.price || 0) * (it.qty || 1)
                }))
            };
        };

        // If browser is offline or in offline mode, save to queue directly without waiting for request timeout
        const isOfflineMode = !isOnline || (typeof window !== 'undefined' && !window.navigator.onLine);
        if (isOfflineMode) {
            try {
                const payload = buildOrderPayload(cartItems, paymentMethod, debtInfo, note, paymentReference);
                const offlineUuid = `off-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const offlineCode = generateOfflineOrderCode();
                const offlineInvoice = buildOfflineInvoice(offlineUuid, offlineCode);

                await enqueueOfflineOrder({
                    clientUuid: offlineUuid,
                    type: paymentMethod === 'debt' ? 'DEBT' : 'STANDARD',
                    payload,
                    orderSnapshot: offlineInvoice,
                    customer
                });

                showOfflineToast();
                setSubmitting(false);
                return { ok: true, isOffline: true, order: offlineInvoice, invoice: offlineInvoice, customer };
            } catch (err) {
                console.error('[OfflineQueue] Failed to enqueue order:', err);
                setError('Không thể lưu đơn ngoại tuyến vào bộ nhớ');
                setSubmitting(false);
                return { ok: false, error: 'Không thể lưu đơn ngoại tuyến vào bộ nhớ' };
            }
        }

        try {
            const payload = buildOrderPayload(cartItems, paymentMethod, debtInfo, note, paymentReference);
            let invoice;
            if (paymentMethod === 'debt') {
                invoice = await createDebtInvoice(payload);
            } else {
                invoice = await createInvoice(payload);
            }

            let invoiceData = null;
            try {
                invoiceData = await getInvoiceData(invoice.id);
            } catch (error) {
                console.error("Failed to fetch invoice data after checkout:", error);
            }

            // Cache newly created order to offline sales_orders store for 7-day exchange/return
            try {
                await saveOfflineSalesOrder({
                    ...invoice,
                    items: invoice.items || [],
                    customer: customer || invoice.customer
                });
            } catch (cacheErr) {
                console.warn("[useCheckout] Failed to cache sales order to offline DB:", cacheErr);
            }

            return { ok: true, order: invoice, invoice: invoiceData, customer };
        } catch (err) {
            console.error("Checkout failed:", err);
            // Check if network error occurred while attempting to submit
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network');
            if (isNetworkError) {
                try {
                    const payload = buildOrderPayload(cartItems, paymentMethod, debtInfo, note, paymentReference);
                    const offlineUuid = `off-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const offlineCode = generateOfflineOrderCode();
                    const offlineInvoice = buildOfflineInvoice(offlineUuid, offlineCode);

                    await enqueueOfflineOrder({
                        clientUuid: offlineUuid,
                        type: paymentMethod === 'debt' ? 'DEBT' : 'STANDARD',
                        payload,
                        orderSnapshot: offlineInvoice,
                        customer
                    });

                    showOfflineToast();
                    return { ok: true, isOffline: true, order: offlineInvoice, invoice: offlineInvoice, customer };
                } catch (queueErr) {
                    console.error('[OfflineQueue] Failed to enqueue order:', queueErr);
                }
            }

            const message = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            setError(message);
            return { ok: false, error: message };
        } finally {
            setSubmitting(false);
        }
    }, [customer, validateCheckout, buildOrderPayload, discount, isOnline]);

    const resetCheckout = useCallback(() => {
        setPhone('');
        setCustomer(null);
        setInvoiceType(null);
        setDiscount(0);
        setSubmitting(false);
        setError(null);
    }, []);

    return {
        phone, setPhone,
        customer, setCustomer,
        invoiceType, setInvoiceType,
        discount, setDiscount,
        submitting,
        error,
        setError,
        lookupCustomer,
        attachCustomer,
        detachCustomer,
        submitCheckout,
        resetCheckout,
    };
}
