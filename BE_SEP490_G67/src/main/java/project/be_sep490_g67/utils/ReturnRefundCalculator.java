package project.be_sep490_g67.utils;

import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.SalesOrderDetail;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Số tiền hoàn cho hàng trả, tính theo giá khách THỰC SỰ đã trả.
 * Giảm giá của cả hóa đơn được phân bổ cho từng dòng theo tỷ lệ thành tiền của dòng
 * đó (quyết định "discount allocated pro-rata on refunds"). Lấy {@code unitPrice × SL}
 * là hoàn theo giá niêm yết.
 */
public final class ReturnRefundCalculator {

    private ReturnRefundCalculator() {
    }

    /**
     * Thành tiền của dòng trước giảm giá hóa đơn (đã trừ giảm giá dòng nếu có).
     */
    public static BigDecimal grossLineTotal(SalesOrderDetail line) {
        if (line.getLineTotal() != null) {
            return line.getLineTotal();
        }
        BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
        int quantity = line.getQuantity() != null ? line.getQuantity() : 0;
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    /**
     * Giá trị thực của từng dòng còn hiệu lực sau khi trừ phần giảm giá hóa đơn được
     * phân bổ, key theo id dòng.
     */
    public static Map<Integer, BigDecimal> netLineTotals(SalesOrder order) {
        List<SalesOrderDetail> lines = order.getSalesOrderDetails().stream()
                .filter(line -> !Boolean.TRUE.equals(line.getIsRemoved()))
                .sorted(Comparator.comparing(SalesOrderDetail::getId,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        BigDecimal gross = lines.stream()
                .map(ReturnRefundCalculator::grossLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal discount = order.getDiscountAmount() != null
                ? order.getDiscountAmount().max(BigDecimal.ZERO).min(gross.max(BigDecimal.ZERO))
                : BigDecimal.ZERO;

        Map<Integer, BigDecimal> result = new LinkedHashMap<>();
        BigDecimal cumulativeGross = BigDecimal.ZERO;
        BigDecimal allocatedSoFar = BigDecimal.ZERO;
        for (SalesOrderDetail line : lines) {
            BigDecimal lineGross = grossLineTotal(line);
            BigDecimal share = BigDecimal.ZERO;
            if (discount.signum() > 0 && gross.signum() > 0) {
                cumulativeGross = cumulativeGross.add(lineGross);
                // Làm tròn LÊN để phần giảm giá không bị chia hụt: tổng hoàn luôn <= tiền hóa đơn.
                BigDecimal allocatedUpToHere = discount.multiply(cumulativeGross)
                        .divide(gross, 0, RoundingMode.CEILING);
                share = allocatedUpToHere.subtract(allocatedSoFar);
                allocatedSoFar = allocatedUpToHere;
            }
            result.put(line.getId(), lineGross.subtract(share));
        }
        return result;
    }

    /**
     * Tiền hoàn cho {@code quantity} đơn vị của một dòng, khi trước đó đã trả
     * {@code alreadyReturned} đơn vị.
     */
    public static BigDecimal refundFor(BigDecimal netLineTotal, int quantityPurchased,
                                       int alreadyReturned, int quantity) {
        if (quantityPurchased <= 0 || quantity <= 0 || netLineTotal == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal before = cumulativeShare(netLineTotal, quantityPurchased, alreadyReturned);
        BigDecimal after = cumulativeShare(netLineTotal, quantityPurchased, alreadyReturned + quantity);
        return after.subtract(before);
    }

    private static BigDecimal cumulativeShare(BigDecimal netLineTotal, int quantityPurchased, int returned) {
        int capped = Math.min(Math.max(returned, 0), quantityPurchased);
        return netLineTotal.multiply(BigDecimal.valueOf(capped))
                .divide(BigDecimal.valueOf(quantityPurchased), 0, RoundingMode.HALF_UP);
    }
}
