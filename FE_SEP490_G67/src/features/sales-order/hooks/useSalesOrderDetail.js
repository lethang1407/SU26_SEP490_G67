import { useCallback, useEffect, useState } from 'react';
import { getSalesOrderDetail } from '../api';
import { getApiErrorMessage } from '../../../utils/api-utils';

export function useSalesOrderDetail(orderId) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDetail = useCallback(() => {
        if (!orderId) return;
        setLoading(true);
        setError(null);
        getSalesOrderDetail(orderId)
            .then(setOrder)
            .catch((err) => {
                setOrder(null);
                setError(getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng'));
            })
            .finally(() => setLoading(false));
    }, [orderId]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    return { order, loading, error, refetch: fetchDetail };
}
