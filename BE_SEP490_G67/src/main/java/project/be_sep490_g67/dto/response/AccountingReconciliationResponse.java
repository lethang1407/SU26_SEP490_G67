package project.be_sep490_g67.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import project.be_sep490_g67.enums.SourceType;

/** Verification is limited to sources present in this system at checkedAt. */
public record AccountingReconciliationResponse(AccountingPeriodResponse period, Instant checkedAt,
        int expectedSourceCount, int recordedLineCount, BigDecimal expectedRevenue, BigDecimal recordedRevenue,
        boolean sourceCompletenessVerified, boolean canClose, List<Issue> issues) {
    public record Issue(String code, SourceType sourceType, Integer sourceId, String message) { }
}

