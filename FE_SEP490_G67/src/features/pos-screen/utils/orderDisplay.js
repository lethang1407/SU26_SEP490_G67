// Helper hiển thị dùng chung cho danh sách hóa đơn
// (modal Lịch sử bán hàng + màn chọn hóa đơn Đổi/Trả)

/** Tên + SĐT khách; không có cả hai => "Khách lẻ" */
export function formatCustomerLabel(order) {
    const name = order?.customerName?.trim();
    const phone = order?.customerPhone?.trim();
    if (!name && !phone) return 'Khách lẻ';
    if (!phone) return name;
    if (!name) return phone;
    return `${name} - ${phone}`;
}

export function formatVnDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
