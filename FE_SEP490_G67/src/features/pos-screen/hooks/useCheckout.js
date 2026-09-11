import { useState, useCallback } from 'react';
import { getCustomerByPhone, createInvoice, createDebtInvoice, getInvoiceData } from '../api';
import { hasLocationProblem, toStockPicks } from '../utils/cartLocation';
import { debtBlockReason } from '../utils/debtStatus';

function endOfDayIso(dateStr) {
    return new Date(`${dateStr}T23:59:59+07:00`).toISOString();
}


export function useCheckout() {
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
            } else {
                setCustomer(null);
                setInvoiceType('not_found');
            }
            return found;
        } catch (error) {
            console.error("Failed to look up customer at checkout:", error);
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

        const badLine = cartItems.find(hasLocationProblem);
        if (badLine) {
            return `"${badLine.name}": chưa chọn vị trí lấy hàng hoặc các lô hàng không đủ số lượng.`;
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
            return { ok: true, order: invoice, invoice: invoiceData, customer };
        } catch (err) {
            console.error("Checkout failed:", err);
            const message = err.response?.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            setError(message);
            return { ok: false, error: message };
        } finally {
            setSubmitting(false);
        }
    }, [customer, validateCheckout, buildOrderPayload]);

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
