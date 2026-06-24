export const isValidQtyInput = (raw) => /^\d*\.?\d*$/.test(raw);

/**
 * Returns true when the committed (on-blur) value is a valid quantity:
 *  - Not empty
 *  - Parseable as a number
 *  - Greater than zero
 */
export const isValidQtyValue = (raw) => {
    if (!raw) return false;

    return /^\d*\.?\d+$/.test(raw) && Number(raw) > 0;
};

/**
 * Returns true when the raw input that is currently being typed
 * represents an invalid committed value (empty, NaN, or ≤ 0).
 * Used to show inline error state while the user is still editing.
 *
 * @param {string|undefined} raw - The raw string being typed, or undefined if not editing.
 * @returns {boolean}
 */
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
