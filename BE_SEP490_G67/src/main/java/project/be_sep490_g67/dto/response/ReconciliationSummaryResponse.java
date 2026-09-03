package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationSummaryResponse {
    private LocalDate date;
    private BigDecimal openingCash;

    // Sales breakdown
    private BigDecimal cashSales;
    private BigDecimal bankSales;
    private BigDecimal debtSales;
    private BigDecimal totalRevenue;

    // Debt payments collected today
    private BigDecimal cashDebtCollected;
    private BigDecimal bankDebtCollected;

    // Cash theory
    private BigDecimal cashRefunded;

    /**
     * Giá trị hàng trả được cấn sang đơn đổi. Đơn đổi ghi số này vào paidAmount nên nó
     * nằm trong cashSales/bankSales, dù không phải tiền vào. Trừ ra khi tính tiền thực thu.
     */
    private BigDecimal exchangeCreditApplied;
    private BigDecimal theoreticalCash; // openingCash + cashSales + cashDebtCollected - cashRefunded

    // Bank theory
    private BigDecimal theoreticalBank; // bankSales + bankDebtCollected

    // Order statistics
    private long totalOrdersCount;
    private long completedOrdersCount;
    private long cancelledOrdersCount;
    private long debtOrdersCount;

    private List<ReconciliationTransactionResponse> transactions;
}
