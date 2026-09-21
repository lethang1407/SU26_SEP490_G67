package project.be_sep490_g67.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Tổng hợp từ các dòng sổ tháng; không phải một kỳ kế toán mới. */
public record AccountingSummaryResponse(
        Integer taxYear,
        String periodType,
        Integer periodNumber,
        BigDecimal recordedRevenue,
        boolean sourceCompletenessVerified,
        boolean partialTracking,
        List<MonthSummary> months) {

    public record MonthSummary(
            Integer month,
            AccountingPeriodResponse period,
            BigDecimal recordedRevenue,
            boolean sourceCompletenessVerified,
            String status,
            Instant trackingStart,
            List<AccountingReconciliationResponse.Issue> issues) { }
}
