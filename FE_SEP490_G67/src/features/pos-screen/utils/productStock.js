/**
 * Phân biệt "có hàng" và "bán được".
 */

/** Tồn hiển thị cho thu ngân: ưu tiên số bán được, BE cũ chưa trả thì lùi về lượng nhập. */
export const displayStock = (product) =>
    Number(product?.sellableQuantity ?? product?.stockQuantity ?? 0);

/**
 * Chưa xếp vị trí nên không thêm vào đơn được.
 * BE cũ không trả `sellableQuantity` → không chặn, để tránh khoá sạch màn bán hàng
 * khi FE lên trước BE.
 */
export const isUnsellable = (product) =>
    product?.sellableQuantity != null && Number(product.sellableQuantity) <= 0;

/** Cùng kết luận như trên nhưng dựa trên /pos-info (đường quét mã vạch). */
export const hasNoSellableLocation = (posInfo) =>
    (posInfo?.locations ?? []).every((loc) => Number(loc.quantity ?? 0) <= 0);

export const UNSELLABLE_HINT = 'Chưa có hàng ở vị trí kho nào — không thêm vào đơn được.';

export const unsellableMessage = (name) =>
    `"${name}" chưa có hàng ở vị trí kho nào nên chưa bán được. `
    + 'Xếp hàng vào vị trí ở màn Kiểm kho trước khi bán.';
