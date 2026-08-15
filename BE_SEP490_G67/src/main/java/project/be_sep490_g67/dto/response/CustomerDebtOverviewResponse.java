package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomerDebtOverviewResponse {
    BigDecimal totalDebt;
    Long debtCustomerCount;
    BigDecimal todayCollectedAmount;
    long totalDebtSalesCount;
    long uniqueCustomersInDebtCount;
    BigDecimal totalDebtAmountIncurredToday;
    NewDebtCustomerAlertResponse newDebtCustomerAlert;
}
