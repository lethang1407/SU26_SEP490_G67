import { useState, useEffect, useCallback } from 'react';
import { getSalesOrderHistory } from '../api';

const PAGE_SIZE = 10;

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
                ...dateParams,
            });
            setOrders(data?.content ?? []);
            setTotal(data?.totalElements ?? 0);
            setTotalPages(data?.totalPages ?? 0);
        } catch (e) {
            console.error("Failed to fetch sales order history:", e);
            setError('Không thể tải lịch sử đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [search, dateFilter, customFrom, customTo]);

    useEffect(() => {
        fetchHistory(page);
    }, [page, fetchHistory]);

    // Reset to page 0 when filter changes
    const changeSearch = useCallback((v) => { setPage(0); setSearch(v); }, []);
    const changeDateFilter = useCallback((v) => { setPage(0); setDateFilter(v); }, []);

    const resetFilters = useCallback(() => {
        setPage(0);
        setSearch('');
        setDateFilter('today');
        setCustomFrom('');
        setCustomTo('');
    }, []);

    return {
        orders, total, totalPages, page, setPage,
        search, setSearch: changeSearch,
        dateFilter, setDateFilter: changeDateFilter,
        resetFilters,
        customFrom, setCustomFrom,
        customTo, setCustomTo,
        loading, error,
        refresh: () => fetchHistory(page),
    };
}
