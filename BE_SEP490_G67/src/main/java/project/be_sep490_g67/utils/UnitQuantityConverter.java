package project.be_sep490_g67.utils;

import project.be_sep490_g67.entity.ProductUnit;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class UnitQuantityConverter {

    private UnitQuantityConverter() {
    }

    public static int toBaseUnits(ProductUnit unit, int quantity) {
        BigDecimal factor = (unit == null || unit.getUnitBase() == null) ? BigDecimal.ONE : unit.getUnitBase();

        if (factor.signum() <= 0) {
            throw new AppException(ErrorCode.INVALID_UNIT_CONVERSION);
        }

        BigDecimal baseQuantity = factor.multiply(BigDecimal.valueOf(quantity));
        try {
            return baseQuantity.setScale(0, RoundingMode.UNNECESSARY).intValueExact();
        } catch (ArithmeticException e) {
            throw new AppException(ErrorCode.INVALID_UNIT_CONVERSION);
        }
    }
}
