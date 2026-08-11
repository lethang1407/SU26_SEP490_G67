package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateImportReturnFromInventoryCheckRequest {

    @NotNull(message = "inventoryCheckId không được để trống")
    Integer inventoryCheckId;

    @NotEmpty(message = "Danh sách dòng trả không được trống")
    @Valid
    List<Line> lines;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {
        @NotNull(message = "batchId không được để trống")
        Integer batchId;

        @NotNull(message = "Số lượng trả không được để trống")
        @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
        Integer quantity;

        String returnReason;
    }
}
