package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CreateRevenueAdjustmentRequest(
        @NotBlank @Size(max = 100) String idempotencyKey,
        @NotNull @Valid RevenueAdjustmentInformation information) {
}

