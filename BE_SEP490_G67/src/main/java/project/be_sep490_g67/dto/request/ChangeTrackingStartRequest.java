package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;

/** A store-wide operation, using the selected profile's version for concurrency control. */
public record ChangeTrackingStartRequest(
        @NotNull @PositiveOrZero Long version,
        @NotNull Instant trackingStartedAt,
        @NotBlank @Size(max = 1000) String reason) {
}

