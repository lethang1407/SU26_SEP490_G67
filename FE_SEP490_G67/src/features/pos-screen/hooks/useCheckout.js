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
        } catch (err) {
            setError('Lỗi tra cứu khách hàng. Vui lòng thử lại.');
            return null;
        }
    }, []);

    /**
     * Gắn khách vào đơn. Xóa luôn ô tìm kiếm: khách đã chọn được hiển thị ở
     * thẻ tình trạng công nợ bên dưới rồi, để lại số điện thoại trong ô đang
     * bị khóa chỉ làm thu ngân tưởng còn gõ tiếp được.
     */
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
     * @param {object} [debtInfo] - chỉ dùng khi paymentMethod === 'debt'
     * @param {number} debtInfo.paidAmount - tiền trả trước, 0 = nợ toàn bộ
     * @param {string} debtInfo.dueDate - hạn trả, dạng yyyy-MM-dd từ input date
     */
    const submitCheckout = useCallback(async (cartItems, paymentMethod, debtInfo) => {
        if (!cartItems || cartItems.length === 0) {
            setError('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
            return { ok: false };
        }

        const badLine = cartItems.find(hasLocationProblem);
        if (badLine) {
            setError(`"${badLine.name}": chưa chọn vị trí lấy hàng hoặc các vị trí đã chọn không đủ số lượng.`);
            return { ok: false };
        }

        // Debt orders must have an attached customer
        if (paymentMethod === 'debt') {
            if (!customer) {
                setError('Đơn nợ phải có thông tin khách hàng. Vui lòng tìm hoặc thêm khách hàng.');
                return { ok: false };
            }
            const blockReason = debtBlockReason(customer);
            if (blockReason) {
                setError(blockReason);
                return { ok: false };
            }
            if (!debtInfo?.dueDate) {
                setError('Vui lòng chọn hạn trả nợ.');
                return { ok: false };
            }
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
                    // Lô-tại-ô thu ngân đã tick là một phần của đơn: BE không
                    // được tự suy lại, vì hàng có thể đã được chuyển chỗ kể từ
                    // lúc chọn.
                    picks: toStockPicks(item),
                    productUnitId: item.productUnitId,
                    quantity: item.qty,
                    unitPrice: item.price,
                })),

                ...(customer?.id ? { customerId: customer.id } : {}),
                ...(paymentMethod === 'debt' ? {
                    paidAmount: debtInfo.paidAmount ?? 0,
                    // input[type=date] cho ra yyyy-MM-dd; BE nhận Instant nên
                    // quy về cuối ngày giờ VN để hạn trả tính hết ngày đó.
                    dueDate: endOfDayIso(debtInfo.dueDate),
                } : {}),
            };

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
            return { ok: false };
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
        detachCustomer,
        submitCheckout,
        resetCheckout,
    };
}
