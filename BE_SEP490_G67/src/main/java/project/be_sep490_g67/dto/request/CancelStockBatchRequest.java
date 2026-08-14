package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CancelStockBatchRequest {

    @NotNull(message = "Số lượng hủy không được để trống")
    @Min(value = 1, message = "Số lượng hủy phải lớn hơn 0")
    Integer quantity;
}
