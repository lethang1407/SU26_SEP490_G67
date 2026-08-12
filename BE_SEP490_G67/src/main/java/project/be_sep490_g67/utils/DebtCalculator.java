package project.be_sep490_g67.utils;

import project.be_sep490_g67.enums.DebtOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Công thức công nợ dùng chung cho mọi nơi hiển thị nợ của một hóa đơn.
 *
 * <p>Trước đây mỗi chỗ tự tính một kiểu: {@code CustomerService} lấy
 * {@code totalAmount - SUM(debtPayments)} (bỏ qua {@code paidAmount}), còn
 * {@code CustomerRepository.searchCustomers} lại lấy
 * {@code totalAmount - (paidAmount + SUM(debtPayments))}. Hiện hai công thức
 * cho cùng kết quả vì đơn bán nợ luôn được tạo với {@code paidAmount = 0}
 * (xem {@code SalesOrderService.createOrder}), nhưng sẽ lệch ngay khi cho phép
 * khách trả trước một phần lúc mua. Lấy bản có {@code paidAmount} làm chuẩn vì
 * nó đúng trong cả hai trường hợp.
 */
public final class DebtCalculator {

    private DebtCalculator() {
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    /**
     * Số tiền hóa đơn còn nợ. Không âm: khách trả dư (do làm tròn, do trả hàng
     * sau khi đã thanh toán) vẫn coi là hết nợ chứ không phải cửa hàng nợ khách.
     *
     * @param totalAmount       tổng tiền hóa đơn
     * @param paidAmount        tiền trả ngay lúc mua
     * @param debtPaymentsTotal tổng các lần trả nợ sau đó
     */
    public static BigDecimal remaining(BigDecimal totalAmount,
                                       BigDecimal paidAmount,
                                       BigDecimal debtPaymentsTotal) {
        BigDecimal remaining = orZero(totalAmount)
                .subtract(orZero(paidAmount))
                .subtract(orZero(debtPaymentsTotal));
        return remaining.compareTo(BigDecimal.ZERO) > 0 ? remaining : BigDecimal.ZERO;
    }

    /**
     * Trạng thái công nợ của một hóa đơn bán nợ.
     *
     * @param remaining số tiền còn nợ (kết quả của {@link #remaining})
     * @param dueDate   hạn trả, null nghĩa là không đặt hạn nên không thể quá hạn
     * @param now       mốc thời gian so sánh
     */
    public static DebtOrderStatus deriveStatus(BigDecimal remaining, Instant dueDate, Instant now) {
        if (orZero(remaining).compareTo(BigDecimal.ZERO) <= 0) {
            return DebtOrderStatus.PAID;
        }
        return dueDate != null && dueDate.isBefore(now)
                ? DebtOrderStatus.OVERDUE
                : DebtOrderStatus.IN_DEBT;
    }
}
