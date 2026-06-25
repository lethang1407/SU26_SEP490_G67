const TECHNICAL_ERROR_PATTERNS = [
    /stack\s*overflow/i,
    /internal server error/i,
    /network error/i,
    /timeout/i,
    /unexpected token/i,
    /json\.parse/i,
];

/**
 * Trích xuất thông báo lỗi từ đối tượng lỗi của API
 * @param {any} error - Đối tượng lỗi được trả về từ axios.
 * @param {string} defaultMessage - Thông báo mặc định nếu không tìm thấy thông báo lỗi cụ thể.
 * @returns {string} - Thông báo lỗi.
 */
export function getApiErrorMessage(error, defaultMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
    const apiMessage = error?.response?.data?.message;

    if (isUserFacingMessage(apiMessage)) {
        return apiMessage;
    }

    const clientMessage = error?.message;

    if (isUserFacingMessage(clientMessage)) {
        return clientMessage;
    }

    return defaultMessage;
}

function isUserFacingMessage(message) {
    if (!message || typeof message !== 'string') {
        return false;
    }

    const normalized = message.trim();

    if (!normalized) {
        return false;
    }

    if (normalized.length > 200) {
        return false;
    }

    return !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}
