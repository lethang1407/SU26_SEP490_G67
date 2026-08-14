import { useCallback, useEffect, useState } from 'react';
import { getSalesOrders } from '../api';
import { DEBT_FILTER, ORDER_STATUS, PAYMENT_METHOD } from '../constants';
import { resolveDateRange } from '../utils/salesOrderUtils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_PAGE = {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
};

export function useSalesOrderList() {
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [orderStatus, setOrderStatus] = useState(ORDER_STATUS.ALL);
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.ALL);
    const [debtFilter, setDebtFilter] = useState(DEBT_FILTER.ALL);
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(keyword);
            setPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [keyword]);

    const fetchOrders = useCallback(() => {
        setLoading(true);
        setError(null);
        const { dateFrom, dateTo } = resolveDateRange(dateFilter, customFrom, customTo);

        const params = {
            page: page - 1,
            size: PAGE_SIZE,
            search: debouncedKeyword || undefined,
            dateFrom,
            dateTo,
            orderStatus: orderStatus === ORDER_STATUS.ALL ? undefined : orderStatus,
            paymentMethod: paymentMethod === PAYMENT_METHOD.ALL ? undefined : paymentMethod,
        };

        if (debtFilter === DEBT_FILTER.YES) params.isDebt = true;
        if (debtFilter === DEBT_FILTER.NO) params.isDebt = false;

        getSalesOrders(params)
            .then((result) => setData(result ?? EMPTY_PAGE))
            .catch(() => {
                setData(EMPTY_PAGE);
                setError('Không thể tải danh sách đơn hàng');
            })
            .finally(() => setLoading(false));
    }, [page, debouncedKeyword, dateFilter, customFrom, customTo, orderStatus, paymentMethod, debtFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const resetPageOnFilter = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    return {
        keyword,
        setKeyword,
        dateFilter,
        setDateFilter: resetPageOnFilter(setDateFilter),
        customFrom,
        setCustomFrom,
        customTo,
        setCustomTo,
        orderStatus,
        setOrderStatus: resetPageOnFilter(setOrderStatus),
        paymentMethod,
        setPaymentMethod: resetPageOnFilter(setPaymentMethod),
        debtFilter,
        setDebtFilter: resetPageOnFilter(setDebtFilter),
        page,
        setPage,
        data,
        loading,
        error,
        pageSize: PAGE_SIZE,
        refetch: fetchOrders,
    };
}
