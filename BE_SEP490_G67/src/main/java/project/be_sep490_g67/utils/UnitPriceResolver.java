package project.be_sep490_g67.utils;

import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.math.BigDecimal;

/**
 * Giá bán của MỘT đơn vị tính.
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
