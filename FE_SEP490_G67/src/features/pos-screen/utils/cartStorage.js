// Lưu tạm giỏ hàng đang bán vào sessionStorage để không mất khi rời màn POS
const KEY = 'pos.activeCart.v1';

export function saveActiveCart(cartItems, qtyInputs) {
    if (!cartItems?.length) {
        clearActiveCart();
        return;
    }
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ cartItems, qtyInputs }));
    } catch {
    }
}

export function loadActiveCart() {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.cartItems) && parsed.cartItems.length
            ? { cartItems: parsed.cartItems, qtyInputs: parsed.qtyInputs ?? {} }
            : null;
    } catch {
        return null;
    }
}

export function clearActiveCart() {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
    }
}
