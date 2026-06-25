import { useState, useCallback } from 'react';
import { getCustomerByPhone, createInvoice, createDebtInvoice, getReceipt } from '../api';

/**
 * Manages the checkout branch of the POS business flow:
 *   Enter phone → lookup customer
 */
export function useCheckout() {
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    // null = not yet looked up, 'standard' = customer found, 'debt' = not found
    const [invoiceType, setInvoiceType] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Look up the customer by phone number.
     * Sets invoiceType to 'standard' if found, 'debt' if not found.
     */
    const lookupCustomer = useCallback(async (phoneValue) => {
        setError(null);
        try {
            const found = await getCustomerByPhone(phoneValue);
            if (found) {
                setCustomer(found);
                setInvoiceType('standard');
            } else {
                setCustomer(null);
                setInvoiceType('debt');
            }
        } catch (err) {
            setError('Lỗi tra cứu khách hàng. Vui lòng thử lại.');
        }
    }, []);

    /**
     * Submit the checkout.
     */
    const submitCheckout = useCallback(async (cartItems, paymentMethod) => {
        if (!invoiceType) {
            setError('Vui lòng tra cứu khách hàng trước khi thanh toán.');
            return;
        }
        if (!cartItems || cartItems.length === 0) {
            setError('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                paymentMethod,
                items: cartItems.map((item) => ({
                    productId: item.productId,
                    batchCode: item.batch,
                    quantity: item.qty,
                    unitPrice: item.price,
                })),
                ...(invoiceType === 'standard' && { customerId: customer?.id }),
            };

            let invoice;
            if (invoiceType === 'standard') {
                invoice = await createInvoice(payload);
            } else {
                invoice = await createDebtInvoice(payload);
            }

            const receiptData = await getReceipt(invoice.id);
            setReceipt(receiptData);
        } catch (err) {
            const message = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }, [invoiceType, customer]);

    /** Reset all checkout state (after receipt is printed / new order). */
    const resetCheckout = useCallback(() => {
        setPhone('');
        setCustomer(null);
        setInvoiceType(null);
        setSubmitting(false);
        setReceipt(null);
        setError(null);
    }, []);

    return {
        phone, setPhone,
        customer,
        invoiceType,
        submitting,
        receipt,
        error,
        lookupCustomer,
        submitCheckout,
        resetCheckout,
    };
}
