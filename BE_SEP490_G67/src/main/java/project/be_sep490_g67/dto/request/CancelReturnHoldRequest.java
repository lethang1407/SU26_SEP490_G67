package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CancelReturnHoldRequest {

    @NotNull(message = "batchLocationId không được để trống")
    Integer batchLocationId;

    /** Null = hủy toàn bộ */
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    Integer quantity;

    @NotBlank(message = "Vui lòng nhập lý do hủy")
    String reason;
}
