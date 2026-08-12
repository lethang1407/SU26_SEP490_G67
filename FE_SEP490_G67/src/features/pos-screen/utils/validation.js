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
export const parseQty = (raw) => {
    const value = Number(raw);

    return Number.isFinite(value) && value > 0
        ? value
        : null;
};
