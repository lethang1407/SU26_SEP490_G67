/**
 * POS – Barcode Validation Utilities
 */
export function validateBarcode(raw) {
    if (!raw || raw.trim().length === 0) {
        return { valid: false, error: 'Mã vạch không được để trống.' };
    }

    const trimmed = raw.trim();

    if (trimmed.length > 50) {
        return { valid: false, error: 'Mã vạch quá dài.' };
    }

    return { valid: true };
}