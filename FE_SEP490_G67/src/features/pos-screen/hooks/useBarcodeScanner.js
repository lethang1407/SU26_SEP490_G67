import { useState, useCallback, useRef, useEffect } from 'react';
import { validateBarcode } from '../utils/barcodeValidation';
import { getProductByBarcode } from '../api';

const ERROR_CLEAR_MS = 4000;

export function useBarcodeScanner({ onProductFound, enabled = true }) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const errorTimerRef = useRef(null);

    const setTimedError = useCallback((message) => {
        setError(message);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setError(null), ERROR_CLEAR_MS);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    }, []);

    const handleBarcodeSubmit = useCallback(async (raw) => {
        const validation = validateBarcode(raw);
        if (!validation.valid) {
            setTimedError(validation.error);
            return;
        }

        setScanning(true);
        clearError();
        try {
            const product = await getProductByBarcode(raw.trim());
            onProductFound(product);
        } catch (err) {
            console.error("Failed to look up product by barcode:", err);
            const status = err.response?.status;
            if (status === 404) {
                setTimedError('Không tìm thấy sản phẩm với mã vạch này.');
            } else {
                setTimedError('Lỗi kết nối. Vui lòng thử lại.');
            }
        } finally {
            setScanning(false);
        }
    }, [onProductFound, setTimedError, clearError]);

    useEffect(() => {
        if (!enabled) return;

        let buffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e) => {
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

            const currentTime = Date.now();
            if (currentTime - lastKeyTime > 50) {
                buffer = '';
            }

            if (e.key === 'Enter') {
                if (buffer.length >= 4) { // Valid barcode length
                    handleBarcodeSubmit(buffer);
                    buffer = '';
                    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                    }
                    e.preventDefault();
                    return;
                }
            } else if (e.key.length === 1) {
                buffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleBarcodeSubmit, enabled]);

    return { scanning, error, handleBarcodeSubmit, clearError };
}
