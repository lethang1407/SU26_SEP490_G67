/**
 * Trích xuất thông báo lỗi từ đối tượng lỗi của API
 * @param {any} error - Đối tượng lỗi được trả về từ axios.
 * @param {string} defaultMessage - Thông báo mặc định nếu không tìm thấy thông báo lỗi cụ thể.
 * @returns {string} - Thông báo lỗi.
 */
export function getApiErrorMessage(error, defaultMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
    return error?.response?.data?.message || error?.message || defaultMessage;
}