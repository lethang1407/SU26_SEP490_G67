package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record UpdateRevenueAdjustmentRequest(
        @NotNull @PositiveOrZero Long version,
        @NotNull @Valid RevenueAdjustmentInformation information) {
}

