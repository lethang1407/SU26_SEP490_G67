package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UnassignBatchRequest {

    @NotNull(message = "batchLocationId không được để trống")
    Integer batchLocationId;
}
