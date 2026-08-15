const VN_NUMBER = new Intl.NumberFormat('vi-VN');

export function formatVnd(amount) {
    return `${VN_NUMBER.format(Number(amount ?? 0))} đ`;
}
