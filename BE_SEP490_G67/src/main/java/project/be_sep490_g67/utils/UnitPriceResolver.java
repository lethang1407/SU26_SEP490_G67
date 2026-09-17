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
     * Dùng khi hiển thị và bán hàng. Ưu tiên giá riêng của đơn vị quy đổi nếu có.
     * Nếu chưa đặt giá riêng, tự động nhân theo giá bán cơ bản và hệ số quy đổi (product.sellingPrice × unitBase).
     */
    public static BigDecimal resolveOrNull(Product product, ProductUnit unit) {
        BigDecimal unitPrice = unit != null ? unit.getSellingPrice() : null;
        if (isPositive(unitPrice)) {
            return unitPrice;
        }

        BigDecimal basePrice = product != null ? product.getSellingPrice() : null;
        if (isPositive(basePrice)) {
            BigDecimal ratio = (unit != null && unit.getUnitBase() != null && unit.getUnitBase().signum() > 0)
                    ? unit.getUnitBase()
                    : BigDecimal.ONE;
            return basePrice.multiply(ratio).setScale(2, java.math.RoundingMode.HALF_UP);
        }

        return null;
    }

    private static boolean isPositive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }
}
