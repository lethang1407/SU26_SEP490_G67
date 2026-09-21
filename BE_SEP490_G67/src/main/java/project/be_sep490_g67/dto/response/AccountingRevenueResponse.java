package project.be_sep490_g67.dto.response;

import java.math.BigDecimal;
import java.util.List;

/** Total excludes EXCLUDED. Verification covers current in-system sources, not unrecorded external business events. */
public record AccountingRevenueResponse(AccountingPeriodResponse period,
        List<AccountingRevenueLineResponse> lines, BigDecimal recordedRevenue,
        boolean sourceCompletenessVerified) {
}
