import { useState, useCallback } from 'react';
import { getCustomerByPhone, createInvoice, createDebtInvoice, getInvoiceData } from '../api';
import { printInvoice } from '../utils/printInvoice';


export function useCheckout() {
    const [phone, setPhone] = useState('');
    const [customer, setCustomer] = useState(null);
    const [invoiceType, setInvoiceType] = useState(null); // null | 'found' | 'not_found'
    const [discount, setDiscount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Lookup customer by phone. Sets invoiceType to 'found' or 'not_found'.
     * Returns the customer object or null so the caller can decide next action.
     */
    const lookupCustomer = useCallback(async (phoneValue) => {
        setError(null);
        try {
            const found = await getCustomerByPhone(phoneValue);
            if (found) {
                setCustomer(found);
                setInvoiceType('found');
            } else {
                setCustomer(null);
                setInvoiceType('not_found');
            }
            return found;
        } catch (err) {
            setError('Lỗi tra cứu khách hàng. Vui lòng thử lại.');
            return null;
        }
    }, []);

    /**
     * Attach a customer object directly (called after quick-add or after confirming found).
     */
    const attachCustomer = useCallback((customerObj) => {
        setCustomer(customerObj);
        setInvoiceType('found');
    }, []);

    const submitCheckout = useCallback(async (cartItems, paymentMethod) => {
        if (!cartItems || cartItems.length === 0) {
            setError('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
            return false;
        }

        // Debt orders must have an attached customer
        if (paymentMethod === 'debt' && !customer) {
            setError('Đơn nợ phải có thông tin khách hàng. Vui lòng tìm hoặc thêm khách hàng.');
            return false;
        }

        setSubmitting(true);
        setError(null);
        try {
            const discountAmount = discount > 0 ? discount : 0;
            const payload = {
                paymentMethod: paymentMethod.toUpperCase(),
                discountAmount,
                items: cartItems.map((item) => ({
                    productId: item.productId,
                    batchId: item.batch,
                    productUnitId: item.productUnitId,
                    quantity: item.qty,
                    unitPrice: item.price,
                })),

                ...(customer?.id ? { customerId: customer.id } : {}),
            };

            let invoice;
            if (paymentMethod === 'debt') {
                invoice = await createDebtInvoice(payload);
            } else {
                invoice = await createInvoice(payload);
            }

            const invoiceData = await getInvoiceData(invoice.id);
            if (invoiceData) printInvoice(invoiceData);
            return true;
        } catch (err) {
            const message = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            setError(message);
            return false;
        } finally {
            setSubmitting(false);
        }
    }, [discount, customer]);

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
        lookupCustomer,
        attachCustomer,
        submitCheckout,
        resetCheckout,
    };
}
