package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateStorageRackRequest {

    @NotBlank(message = "Khu vực không được để trống")
    @Size(max = 50, message = "Khu vực tối đa 50 ký tự")
    String zone;

    @Size(max = 200, message = "Tên khu tối đa 200 ký tự")
    String title;

    @NotNull(message = "Số tầng không được để trống")
    @Min(value = 1, message = "Số tầng tối thiểu là 1")
    @Max(value = 10, message = "Số tầng tối đa là 10")
    Integer floorCount;

    @NotNull(message = "Số ô không được để trống")
    @Min(value = 1, message = "Số ô tối thiểu là 1")
    @Max(value = 10, message = "Số ô tối đa là 10")
    Integer binCount;

    /** SM | MD | LG — tuỳ chọn, mặc định MD. */
    @Size(max = 10, message = "Kích thước tối đa 10 ký tự")
    String size;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
