import { useState, useEffect, useRef, useCallback } from 'react';
import { searchCustomers } from '../api';

import { searchOfflineCustomers, saveOfflineCustomers } from '@/lib/db';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 1;

export function useCustomerSearch(query) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const debounceRef = useRef(null);

    const clearResults = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmed = query?.trim() ?? '';

        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const data = await searchCustomers(trimmed);
                setResults(data ?? []);
                setError(null);
                if (Array.isArray(data) && data.length > 0) {
                    saveOfflineCustomers(data).catch((cacheErr) => {
                        console.warn("[useCustomerSearch] Failed to cache customers to offline store:", cacheErr);
                    });
                }
            } catch (err) {
                console.error("Failed to search customers:", err);
                // Fallback to offline customer search
                try {
                    const offlineCustomers = await searchOfflineCustomers(trimmed);
                    if (offlineCustomers && offlineCustomers.length > 0) {
                        setResults(offlineCustomers);
                        setError(null);
                        return;
                    }
                } catch (offlineErr) {
                    console.warn("[useCustomerSearch] Offline customer search fallback failed:", offlineErr);
                }
                setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    return { results, loading, error, clearResults };
}
