package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateImportReturnLineStatusRequest {

    @NotBlank
    String lineStatus;

    /** HSD lô đổi mới (tuỳ chọn) — chỉ dùng khi đánh dấu DONE với hình thức Đổi. */
    LocalDate exchangeExpiryDate;
}
