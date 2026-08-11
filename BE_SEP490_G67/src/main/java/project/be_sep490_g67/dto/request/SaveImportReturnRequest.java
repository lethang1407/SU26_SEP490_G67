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
public class SaveImportReturnRequest {

    String note;
    String source;

    Integer inventoryCheckId;

    @NotEmpty(message = "Danh sách dòng không được trống")
    @Valid
    List<Line> lines;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {
        @NotNull
        Integer batchId;

        @NotNull
        @Min(1)
        Integer quantity;

        String method;
        String note;
        String returnReason;
    }
}
