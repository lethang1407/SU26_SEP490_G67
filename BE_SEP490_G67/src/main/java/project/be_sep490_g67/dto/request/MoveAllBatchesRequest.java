package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MoveAllBatchesRequest {

    @NotNull(message = "fromLocationId không được để trống")
    Integer fromLocationId;

    @NotNull(message = "toLocationId không được để trống")
    Integer toLocationId;
}
