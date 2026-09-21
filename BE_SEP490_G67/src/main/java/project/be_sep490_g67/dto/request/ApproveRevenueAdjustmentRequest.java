package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;

public record ApproveRevenueAdjustmentRequest(
        @NotNull @PositiveOrZero Long version,
        @NotBlank @Size(max = 1000) String reason,
        Boolean acceptCrossPeriodPosting) {
    public ApproveRevenueAdjustmentRequest {
        if (acceptCrossPeriodPosting == null) acceptCrossPeriodPosting = false;
    }
}
