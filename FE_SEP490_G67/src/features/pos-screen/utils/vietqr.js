const VIETQR_BASE = 'https://img.vietqr.io/image';

/** 540x640, có sẵn logo ngân hàng và dòng thông tin chuyển khoản dưới mã. */
export const VIETQR_TEMPLATE = 'compact2';

export function buildPaymentReference(now = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const salt = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return 'CK'
        + String(now.getFullYear()).slice(2)
        + pad(now.getMonth() + 1)
        + pad(now.getDate())
        + pad(now.getHours())
        + pad(now.getMinutes())
        + pad(now.getSeconds())
        + salt;
}

/** Đã khai đủ tài khoản để dựng được mã QR chưa. */
export function hasBankAccount(bank) {
    return Boolean(bank?.bankId && bank?.bankAccountNo);
}


export function buildVietQrUrl(bank, amount, reference) {
    if (!hasBankAccount(bank)) return null;

    const params = new URLSearchParams();
    // VietQR nhận số nguyên đồng; số lẻ làm ngân hàng từ chối mã.
    params.set('amount', String(Math.round(Number(amount) || 0)));
    if (reference) params.set('addInfo', reference);
    if (bank.bankAccountName) params.set('accountName', bank.bankAccountName);

    return `${VIETQR_BASE}/${bank.bankId}-${bank.bankAccountNo}-${VIETQR_TEMPLATE}.png`
        + `?${params.toString()}`;
}
