import { useState, useCallback } from 'react';
import { getInvoiceData } from '../api';

export default function useInvoiceExport() {
    const [invoiceData, setInvoiceData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchInvoice = useCallback(async (orderId) => {
        if (orderId == null || !Number.isFinite(Number(orderId)) || Number(orderId) <= 0) {
            setError('Mã đơn hàng không hợp lệ');
            return;
        }

        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await getInvoiceData(orderId);
            setInvoiceData(data);
            return data;   // allow callers to chain (e.g. trigger print immediately)
        } catch (err) {
            const msg = err.response?.data?.message
                ?? 'Không thể tải dữ liệu hóa đơn. Vui lòng thử lại.';
            setError(msg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    const clearInvoice = useCallback(() => {
        setInvoiceData(null);
        setError(null);
    }, []);

    return { invoiceData, isLoading, error, fetchInvoice, clearInvoice };
}