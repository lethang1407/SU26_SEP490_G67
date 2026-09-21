package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;

public record CreateTaxProfileRequest(
        @NotNull @Min(2000) @Max(2100) Integer taxYear,
        Instant trackingStartedAt,
        @NotNull @Valid TaxProfileInformation information) {
}

