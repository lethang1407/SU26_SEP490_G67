package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateImportReturnDraftLineRequest {

    @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
    Integer quantity;

    String returnReason;
}
