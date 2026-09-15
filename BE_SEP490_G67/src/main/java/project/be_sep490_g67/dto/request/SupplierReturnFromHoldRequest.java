package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierReturnFromHoldRequest {

    @NotNull(message = "batchLocationId không được để trống")
    Integer batchLocationId;

    /** Null = toàn bộ số lượng trên dòng RT */
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    Integer quantity;

    /** RETURN | EXCHANGE */
    String method;

    String note;
}
