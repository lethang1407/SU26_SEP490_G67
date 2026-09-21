package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;

/** Explicit version and reason for rejecting a draft or closing a period. */
public record AccountingDecisionRequest(
        @NotNull @PositiveOrZero Long version,
        @NotBlank @Size(max = 1000) String reason) {
}

