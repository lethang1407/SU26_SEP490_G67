/**
 * Phân biệt "có hàng" và "bán được".
 */

/** Tồn hiển thị cho thu ngân: ưu tiên số bán được, BE cũ chưa trả thì lùi về lượng nhập. */
export const displayStock = (product) =>
    Number(product?.sellableQuantity ?? product?.stockQuantity ?? 0);

export const isUnsellable = (product) =>
    product?.sellableQuantity != null && Number(product.sellableQuantity) <= 0;

const hasStock = (loc) => Number(loc.quantity ?? 0) > 0;

export const hasNoSellableLocation = (posInfo) =>
    !(posInfo?.locations ?? []).some((loc) => hasStock(loc) && loc.expired !== true);

/** Còn hàng trên kệ nhưng toàn là lô đã hết hạn — kho chưa xử lý. */
const hasOnlyExpiredStock = (posInfo) =>
    (posInfo?.locations ?? []).some((loc) => hasStock(loc) && loc.expired === true);

export const UNSELLABLE_HINT = 'Chưa có hàng ở vị trí kho nào — không thêm vào đơn được.';

export const unsellableMessage = (name, posInfo) =>
    hasOnlyExpiredStock(posInfo)
        ? `"${name}" chỉ còn hàng thuộc lô đã hết hạn nên không bán được. `
            + 'Báo kho xử lý lô hết hạn.'
        : `"${name}" chưa có hàng ở vị trí kho nào nên chưa bán được. `
            + 'Xếp hàng vào vị trí ở màn Kiểm kho trước khi bán.';
