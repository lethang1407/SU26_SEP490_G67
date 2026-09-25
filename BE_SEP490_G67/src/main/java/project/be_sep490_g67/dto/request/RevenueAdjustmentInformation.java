package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import project.be_sep490_g67.enums.*;

public record RevenueAdjustmentInformation(
        @NotNull SourceType sourceType, @Positive Integer sourceId,
        @Positive Integer relatedPeriodId, @Positive Integer originalAdjustmentId,
        @NotNull LocalDate date,
        @NotNull @Digits(integer = 17, fraction = 2) BigDecimal signedAmount,
        @NotNull RevenueClassification classification,
        @NotBlank @Size(max = 1000) String inclusionReason,
        @NotBlank @Size(max = 10000) String evidence) {
    @JsonIgnore
    public Instant occurredAt() {
        return date.atStartOfDay(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
    }

    @JsonIgnore
    public LocalDate postingDate() {
        return date;
    }
}

