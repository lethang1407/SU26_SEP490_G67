package project.be_sep490_g67.dto.response;

import java.time.Instant;
import project.be_sep490_g67.entity.AccountingPeriod;
import project.be_sep490_g67.enums.PeriodStatus;

public record AccountingPeriodResponse(
        Integer id, Integer profileId, Integer taxYear, Integer accountingMonth,
        Instant startAt, Instant endExclusive, PeriodStatus status,
        Long version, Integer closedBy, Instant closedAt) {
    public static AccountingPeriodResponse from(AccountingPeriod p) {
        return new AccountingPeriodResponse(p.getId(), p.getProfile().getId(), p.getProfile().getTaxYear(),
                p.getAccountingMonth(), p.getStartAt(), p.getEndExclusive(), p.getStatus(),
                p.getVersion(), p.getClosedBy(), p.getClosedAt());
    }
}

