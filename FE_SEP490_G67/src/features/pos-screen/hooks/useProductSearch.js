import { useState, useEffect, useRef, useCallback } from 'react';
import { searchProductsByName } from '../api';

import { searchOfflineProducts, saveOfflineProducts } from '@/lib/db';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 1;

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

        // 1. Instant Cache-First Search (0ms response from local IndexedDB)
        let hasOfflineData = false;
        searchOfflineProducts(trimmed)
            .then((offlineData) => {
                if (Array.isArray(offlineData) && offlineData.length > 0) {
                    hasOfflineData = true;
                    setResults(offlineData);
                    setError(null);
                }
            })
            .catch((err) => {
                console.warn('[useProductSearch] Instant offline lookup error:', err);
            });

        // 2. If online, fetch fresh stock/price from backend with debounce
        if (typeof window !== 'undefined' && window.navigator.onLine) {
            if (!hasOfflineData) {
                setLoading(true);
            }

            debounceRef.current = setTimeout(async () => {
                try {
                    const data = await searchProductsByName(trimmed);
                    if (Array.isArray(data) && data.length > 0) {
                        setResults(data);
                        setError(null);
                        saveOfflineProducts(data).catch((cacheErr) => {
                            console.warn('[useProductSearch] Failed to cache products:', cacheErr);
                        });
                    } else if (!hasOfflineData) {
                        // Keep offline results if API returns empty
                        const fallbackData = await searchOfflineProducts(trimmed);
                        if (fallbackData && fallbackData.length > 0) {
                            setResults(fallbackData);
                            setError(null);
                        } else {
                            setResults([]);
                        }
                    }
                } catch (err) {
                    console.warn('[useProductSearch] Online search failed, checking offline DB:', err);
                    try {
                        const fallbackData = await searchOfflineProducts(trimmed);
                        if (fallbackData && fallbackData.length > 0) {
                            setResults(fallbackData);
                            setError(null);
                        } else {
                            setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
                            setResults([]);
                        }
                    } catch (offlineErr) {
                        console.warn('[useProductSearch] Offline search fallback failed:', offlineErr);
                        setError('Không thể tải danh sách sản phẩm.');
                        setResults([]);
                    }
                } finally {
                    setLoading(false);
                }
            }, DEBOUNCE_MS);
        } else {
            setLoading(false);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    return { results, loading, error, clearResults };
}
