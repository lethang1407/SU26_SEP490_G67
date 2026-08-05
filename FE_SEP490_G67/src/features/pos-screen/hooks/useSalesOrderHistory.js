import { useState, useEffect, useCallback } from 'react';
import { getSalesOrderHistory } from '../api';

const PAGE_SIZE = 10;

/**
 * DATE_FILTER options: 'today' | 'yesterday' | '7days' | 'custom'
 * For 'custom', caller sets customFrom / customTo (ISO date strings YYYY-MM-DD).
 */
function buildDateParams(dateFilter, customFrom, customTo) {
    const now = new Date();
    const toLocalDate = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD

    switch (dateFilter) {
        case 'today': {
            const today = toLocalDate(now);
            return { dateFrom: today, dateTo: today };
        }
        case 'yesterday': {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yStr = toLocalDate(y);
            return { dateFrom: yStr, dateTo: yStr };
        }
        case '7days': {
            const d7 = new Date(now);
            d7.setDate(d7.getDate() - 6);
            return { dateFrom: toLocalDate(d7), dateTo: toLocalDate(now) };
        }
        case 'custom':
            return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
        default:
            return {};
    }
}

export function useSalesOrderHistory() {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    // Các ô tìm kiếm riêng (mã hóa đơn / khách hàng / sản phẩm)
    const [orderCode, setOrderCode] = useState('');
    const [customer, setCustomer] = useState('');
    const [product, setProduct] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistory = useCallback(async (currentPage) => {
        setLoading(true);
        setError(null);
        try {
            const dateParams = buildDateParams(dateFilter, customFrom, customTo);
            const data = await getSalesOrderHistory({
                page: currentPage,
                size: PAGE_SIZE,
                search: search.trim() || undefined,
                orderCode: orderCode.trim() || undefined,
                customer: customer.trim() || undefined,
                product: product.trim() || undefined,
                ...dateParams,
            });
            setOrders(data?.content ?? []);
            setTotal(data?.totalElements ?? 0);
            setTotalPages(data?.totalPages ?? 0);
        } catch (e) {
            setError('Không thể tải lịch sử đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [search, orderCode, customer, product, dateFilter, customFrom, customTo]);

    useEffect(() => {
        fetchHistory(page);
    }, [page, fetchHistory]);

    // Reset to page 0 when filter changes
    const changeSearch = useCallback((v) => { setPage(0); setSearch(v); }, []);
    const changeOrderCode = useCallback((v) => { setPage(0); setOrderCode(v); }, []);
    const changeCustomer = useCallback((v) => { setPage(0); setCustomer(v); }, []);
    const changeProduct = useCallback((v) => { setPage(0); setProduct(v); }, []);
    const changeDateFilter = useCallback((v) => { setPage(0); setDateFilter(v); }, []);

    const resetFilters = useCallback(() => {
        setPage(0);
        setSearch('');
        setOrderCode('');
        setCustomer('');
        setProduct('');
        setDateFilter('today');
        setCustomFrom('');
        setCustomTo('');
    }, []);

    return {
        orders, total, totalPages, page, setPage,
        search, setSearch: changeSearch,
        orderCode, setOrderCode: changeOrderCode,
        customer, setCustomer: changeCustomer,
        product, setProduct: changeProduct,
        dateFilter, setDateFilter: changeDateFilter,
        resetFilters,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        loading, error,
        refresh: () => fetchHistory(page),
    };
}
