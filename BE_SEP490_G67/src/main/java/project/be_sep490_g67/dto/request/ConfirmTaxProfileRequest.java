package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.*;

public record ConfirmTaxProfileRequest(@NotNull @PositiveOrZero Long version) {
}

