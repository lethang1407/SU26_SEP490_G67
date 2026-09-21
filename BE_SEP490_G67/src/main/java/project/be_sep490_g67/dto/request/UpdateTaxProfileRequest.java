package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

/** Tracking date and tax year cannot be changed through this request. */
public record UpdateTaxProfileRequest(
        @NotNull @PositiveOrZero Long version,
        @NotNull @Valid TaxProfileInformation information) {
}

