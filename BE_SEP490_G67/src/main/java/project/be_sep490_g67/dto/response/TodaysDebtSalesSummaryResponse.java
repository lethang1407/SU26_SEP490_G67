package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodaysDebtSalesSummaryResponse {
    private long totalDebtSalesCount;
    private long uniqueCustomersInDebtCount;
    private BigDecimal totalDebtAmountIncurredToday;
    private List<DebtOrderResponse> debtSalesDetails;
}
