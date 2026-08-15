package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodaysDebtSalesSummaryResponse {
    private Integer customerId;
    private String customerName;
    private Boolean isCheckDebtUnstable;
    private List<DebtOrderResponse> debtSalesDetails;
}
