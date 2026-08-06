package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssignBatchRequest {

    @NotNull(message = "batchId không được để trống")
    Integer batchId;

    @NotNull(message = "locationId không được để trống")
    Integer locationId;

    /** Null = xếp toàn bộ số lượng còn lại chưa xếp kệ */
    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    Integer quantity;
}
