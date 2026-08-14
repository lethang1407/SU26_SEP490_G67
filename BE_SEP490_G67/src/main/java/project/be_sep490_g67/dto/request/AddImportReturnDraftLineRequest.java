package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddImportReturnDraftLineRequest {

    @NotNull(message = "batchId không được để trống")
    Integer batchId;

    @NotNull(message = "Số lượng trả không được để trống")
    @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
    Integer quantity;

    String returnReason;

    /** MANUAL (default) | INVENTORY_CHECK */
    String source;
}
