package project.be_sep490_g67.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import project.be_sep490_g67.entity.AccountingRevenueLine;
import project.be_sep490_g67.enums.*;

public record AccountingRevenueLineResponse(Integer id, Integer periodId, SourceType sourceType,
        Integer sourceId, String sourceCode, String sourceVersion, Instant occurredAt, LocalDate postingDate,
        BigDecimal signedAmount, RevenueClassification classification, String inclusionReason, String description) {
    public static AccountingRevenueLineResponse from(AccountingRevenueLine l) {
        return new AccountingRevenueLineResponse(l.getId(), l.getPeriod().getId(), l.getSourceType(),
                l.getSourceId(), l.getSourceCode(), l.getSourceVersion(), l.getOccurredAt(), l.getPostingDate(),
                l.getSignedAmount(), l.getClassification(), l.getInclusionReason(), l.getDescription());
    }
}

