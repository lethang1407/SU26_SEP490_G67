import { useState, useCallback, useRef, useEffect } from 'react';
import { validateBarcode } from '../utils/barcodeValidation';
import { getProductByBarcode } from '../api';

const ERROR_CLEAR_MS = 4000;

export function useBarcodeScanner({ onProductFound }) {
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

    // Global listener for physical barcode scanners
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e) => {
            // Ignore modifiers
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

            const currentTime = Date.now();
            
            // Barcode scanners type characters with very small intervals (< 30ms).
            // If the delay is > 50ms, it's likely human typing, so clear the buffer.
            if (currentTime - lastKeyTime > 50) {
                buffer = '';
            }

            if (e.key === 'Enter') {
                if (buffer.length >= 4) { // Valid barcode length
                    handleBarcodeSubmit(buffer);
                    buffer = '';
                    
                    // If focused on an input, try to prevent form submission or unwanted behavior
                    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                        // Optionally blur to clear focus: document.activeElement.blur();
                    }
                    e.preventDefault();
                    return;
                }
            } else if (e.key.length === 1) { // Printable characters
                buffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [handleBarcodeSubmit]);

    return { scanning, error, handleBarcodeSubmit, clearError };
}
