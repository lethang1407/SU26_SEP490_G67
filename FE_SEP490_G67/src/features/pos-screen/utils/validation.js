export const isValidQtyInput = (raw) => /^\d*\.?\d*$/.test(raw);

export const isValidQtyValue = (raw) => {
    if (!raw) return false;

    return /^\d*\.?\d+$/.test(raw) && Number(raw) > 0;
};

export const isQtyInvalid = (raw) => {
    if (raw === undefined) return false;

    const value = Number(raw);

    return raw === '' || !Number.isFinite(value) || value <= 0;
};
/**
 * SĐT di động VN, khớp đúng regex BE dùng khi tạo khách
 * (CustomerRequest.phoneNumber) để POS không gửi lên số chắc chắn bị từ chối.
 */
const VN_PHONE = /^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-46-9])\d{7}$/;

export const isVnPhone = (raw) => VN_PHONE.test((raw ?? '').trim());

export const parseQty = (raw) => {
    const value = Number(raw);

    return Number.isFinite(value) && value > 0
        ? value
        : null;
};
