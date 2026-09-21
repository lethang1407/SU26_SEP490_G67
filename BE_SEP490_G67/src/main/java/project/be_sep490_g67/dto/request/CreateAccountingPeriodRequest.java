package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;

/** The server computes the range; the caller identifies a month and the profile it reviewed. */
public record CreateAccountingPeriodRequest(
        @NotNull @Min(1) @Max(12) Integer accountingMonth,
        @NotNull @PositiveOrZero Long profileVersion) {
}

