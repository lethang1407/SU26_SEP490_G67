package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** Version bắt buộc khi xác nhận bản tính nghĩa vụ thuế năm. */
public record ConfirmTaxRecordRequest(
        @NotNull @PositiveOrZero Long version) {
}
