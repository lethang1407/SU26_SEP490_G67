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
        } catch {
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

    /**
     * Những gì phải đúng trước khi động tới tiền của khách.
     *
     * <p>Tách khỏi submitCheckout vì luồng chuyển khoản phải kiểm TRƯỚC lúc dựng QR:
     * đưa khách quét một mã rồi mới báo "chưa chọn vị trí lấy hàng" là bắt khách chờ
     * vô ích, tệ hơn nữa là tiền đã về mà đơn thì không ghi sổ được.
     *
     * @returns {string|null} câu lỗi tiếng Việt, hoặc null nếu qua hết
     */
    const validateCheckout = useCallback((cartItems, paymentMethod, debtInfo) => {
        if (!cartItems || cartItems.length === 0) {
            return 'Giỏ hàng trống. Vui lòng thêm sản phẩm.';
        }

        const badLine = cartItems.find(hasLocationProblem);
        if (badLine) {
            return `"${badLine.name}": chưa chọn vị trí lấy hàng hoặc các vị trí đã chọn không đủ số lượng.`;
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

    /**
     * Thân request tạo đơn.
     *
     * <p>Luồng chuyển khoản gửi CHÍNH payload này hai lần: lần đầu để BE tính ra số
     * tiền trên QR, lần sau để ghi sổ đơn. Dùng chung một hàm để hai lần đó không thể
     * lệch nhau — lệch là QR thu một đằng, đơn ghi một nẻo.
     */
    const buildOrderPayload = useCallback((cartItems, paymentMethod, debtInfo, note, payosOrderCode) => {
        const discountAmount = discount > 0 ? discount : 0;
        return {
            paymentMethod: paymentMethod.toUpperCase(),
            discountAmount,
            note: note?.trim() ? note.trim() : null,
            items: cartItems.map((item) => ({
                productId: item.productId,
                // Lô-tại-ô thu ngân đã tick là một phần của đơn: BE không
                // được tự suy lại, vì hàng có thể đã được chuyển chỗ kể từ
                // lúc chọn.
                picks: toStockPicks(item),
                productUnitId: item.productUnitId,
                quantity: item.qty,
                unitPrice: item.price,
            })),

            ...(customer?.id ? { customerId: customer.id } : {}),
            ...(payosOrderCode ? { payosOrderCode } : {}),
            ...(paymentMethod === 'debt' ? {
                paidAmount: debtInfo.paidAmount ?? 0,
                // input[type=date] cho ra yyyy-MM-dd; BE nhận Instant nên
                // quy về cuối ngày giờ VN để hạn trả tính hết ngày đó.
                dueDate: endOfDayIso(debtInfo.dueDate),
            } : {}),
        };
    }, [discount, customer]);

    /**
     * Ghi sổ đơn.
     *
     * @param payosOrderCode mã phiên chuyển khoản ĐÃ thanh toán. Bắt buộc với đơn
     *        chuyển khoản — BE từ chối đơn TRANSFER không kèm mã này.
     */
    const submitCheckout = useCallback(async (cartItems, paymentMethod, debtInfo, note, payosOrderCode) => {
        const validationError = validateCheckout(cartItems, paymentMethod, debtInfo);
        if (validationError) {
            setError(validationError);
            return { ok: false, error: validationError };
        }

        setSubmitting(true);
        setError(null);
        try {
            const payload = buildOrderPayload(cartItems, paymentMethod, debtInfo, note, payosOrderCode);

            let invoice;
            if (paymentMethod === 'debt') {
                invoice = await createDebtInvoice(payload);
            } else {
                invoice = await createInvoice(payload);
            }

            // Không in thẳng nữa: POS mở màn xem trước hóa đơn, thu ngân tự quyết
            // in hay hủy. Vẫn nạp sẵn dữ liệu ở đây để nút "In" không phải chờ.
            let invoiceData = null;
            try {
                invoiceData = await getInvoiceData(invoice.id);
            } catch {
                // Đơn đã lưu xong rồi — không lấy được bản in thì vẫn coi là thành công,
                // màn hóa đơn sẽ tự tải lại khi bấm In.
            }
            return { ok: true, order: invoice, invoice: invoiceData, customer };
        } catch (err) {
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
        validateCheckout,
        buildOrderPayload,
        submitCheckout,
        resetCheckout,
    };
}
