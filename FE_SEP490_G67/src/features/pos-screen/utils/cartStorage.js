const KEY = 'pos.activeCart.v3';

export function saveActiveCart(cartItems, qtyInputs) {
    if (!cartItems?.length) {
        clearActiveCart();
        return;
    }
    try {
        sessionStorage.setItem(KEY, JSON.stringify({ cartItems, qtyInputs }));
    } catch (error) {
        // Hết quota hoặc trình duyệt chặn sessionStorage: giỏ hàng không được giữ lại,
        // thu ngân tải lại trang là mất. Không chặn được ở đây nhưng phải có vết.
        console.error("Failed to save active cart to sessionStorage:", error);
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
    } catch (error) {
        // Dữ liệu hỏng hoặc không đọc được: coi như không có giỏ đang dở.
        console.error("Failed to load active cart from sessionStorage:", error);
        return null;
    }
}

export function clearActiveCart() {
    try {
        sessionStorage.removeItem(KEY);
    } catch (error) {
        console.error("Failed to clear active cart from sessionStorage:", error);
    }
}
