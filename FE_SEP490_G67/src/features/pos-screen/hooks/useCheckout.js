import { useState, useCallback } from 'react';
import { getCustomerByPhone, createInvoice, createDebtInvoice, getReceipt } from '../api';


export function useCheckout() {
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [invoiceType, setInvoiceType] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState(null);
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

    const submitCheckout = useCallback(async (cartItems, paymentMethod) => {
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
                    batchId: item.batch,
                    quantity: item.qty,
                    unitPrice: item.price,
                })),

                ...(invoiceType === 'standard' && customer?.id ? { customerId: customer.id } : {}),
            };

            let invoice;
            if (invoiceType === 'debt') {
                invoice = await createDebtInvoice(payload);
            } else {
                invoice = await createInvoice(payload);
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
