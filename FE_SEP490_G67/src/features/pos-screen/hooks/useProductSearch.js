import { useState, useEffect, useRef, useCallback } from 'react';
import { searchProductsByName } from '../api';

import { searchOfflineProducts, saveOfflineProducts } from '@/lib/db';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useProductSearch(query) {
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
                const data = await searchProductsByName(trimmed);
                setResults(data);
                setError(null);
                if (Array.isArray(data) && data.length > 0) {
                    saveOfflineProducts(data).catch(() => {});
                }
            } catch (err) {
                // Fallback to offline search
                try {
                    const offlineData = await searchOfflineProducts(trimmed);
                    if (offlineData && offlineData.length > 0) {
                        setResults(offlineData);
                        setError(null);
                        return;
                    }
                } catch {
                    // Ignore Dexie error
                }
                setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
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
