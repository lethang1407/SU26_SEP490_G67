import {useEffect, useState} from 'react';
import {getStorePaymentInfo} from '../api';

/**
 * Tài khoản ngân hàng của cửa hàng, nạp một lần cho cả phiên làm việc.
 */
export function useStorePaymentInfo() {
    const [bank, setBank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await getStorePaymentInfo();
                if (!cancelled) setBank(result ?? null);
            } catch (error) {
                console.error("Failed to fetch store payment info:", error);
                if (!cancelled) {
                    setError('Không đọc được thông tin chuyển khoản của cửa hàng.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return {bank, loading, error};
}
