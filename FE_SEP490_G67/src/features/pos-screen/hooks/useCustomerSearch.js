import { useState, useEffect, useRef, useCallback } from 'react';
import { searchCustomersByPhone } from '../api';

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
                const data = await searchCustomersByPhone(trimmed);
                setResults(data);
                setError(null);
            } catch (err) {
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
