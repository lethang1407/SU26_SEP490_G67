package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import project.be_sep490_g67.enums.*;

public record RevenueAdjustmentInformation(
        @NotNull SourceType sourceType, @Positive Integer sourceId,
        @Positive Integer relatedPeriodId, @Positive Integer originalAdjustmentId,
        @NotNull Instant occurredAt, @NotNull LocalDate postingDate,
        @NotNull @Digits(integer = 17, fraction = 2) BigDecimal signedAmount,
        @NotNull RevenueClassification classification,
        @NotBlank @Size(max = 1000) String inclusionReason,
        @NotBlank @Size(max = 10000) String evidence) {
}

