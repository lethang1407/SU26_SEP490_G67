package project.be_sep490_g67.utils;

import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.math.BigDecimal;

/**
 * Giá bán của MỘT đơn vị tính. Nguồn duy nhất là {@code product_units.selling_price}.
 *
 * <p>Sản phẩm bán theo nhiều đơn vị (lon / lốc 6 lon / thùng 24 lon). Số lượng đã được
 * quy đổi về đơn vị cơ bản khi trừ kho ({@link UnitQuantityConverter}), nhưng giá thì
 * trước đây không: POS gửi lên giá của đơn vị cơ bản kể cả khi thu ngân chọn "Lốc", nên
 * cửa hàng giao 6 lon mà chỉ thu tiền 1 lon. Tồn kho vẫn trừ đủ 6 nên sổ sách không lệch
 * số lượng — sai sót chỉ lộ ra lúc kiểm quỹ cuối ca.
 *
 * <p>Cố tình KHÔNG suy giá bằng {@code product.selling_price × unit_base}: mỗi đơn vị
 * phải có giá của chính nó trong bảng, để cửa hàng đặt được giá lốc/thùng rẻ hơn mua lẻ.
 * Suy ngược từ giá lẻ sẽ lặng lẽ ghi đè mức giá sỉ mà quản lý đã đặt.
 *
 * <p>Thiếu giá thì ném lỗi chứ không trả 0: giao hàng với giá 0 đồng tệ hơn nhiều so với
 * việc chặn thu ngân lại và bắt bổ sung giá cho đơn vị đó.
 */
public final class UnitPriceResolver {

    private UnitPriceResolver() {
    }

    /** Dùng khi ghi sổ (bán hàng): thiếu giá là chặn lại chứ không bán giá 0. */
    public static BigDecimal resolve(Product product, ProductUnit unit) {
        BigDecimal price = resolveOrNull(product, unit);
        if (price == null) {
            throw new AppException(ErrorCode.PRODUCT_PRICE_MISSING);
        }
        return price;
    }

    /**
     * Dùng khi chỉ hiển thị (tìm kiếm, quét mã). Một sản phẩm chưa đặt giá không được
     * phép làm hỏng cả danh sách kết quả, nên ở đây trả {@code null} và để màn hình
     * tự quyết cách thể hiện.
     */
    public static BigDecimal resolveOrNull(Product product, ProductUnit unit) {
        BigDecimal unitPrice = unit != null ? unit.getSellingPrice() : null;
        if (isPositive(unitPrice)) {
            return unitPrice;
        }

        // Không có đơn vị nào (dữ liệu cũ) thì đành dùng giá trên sản phẩm — đó là
        // giá của một đơn vị cơ bản, và khi không có đơn vị thì số lượng cũng được
        // tính theo đơn vị cơ bản, nên hai vế vẫn khớp.
        if (unit == null) {
            BigDecimal basePrice = product != null ? product.getSellingPrice() : null;
            return isPositive(basePrice) ? basePrice : null;
        }

        return null;
    }

    private static boolean isPositive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }
}
