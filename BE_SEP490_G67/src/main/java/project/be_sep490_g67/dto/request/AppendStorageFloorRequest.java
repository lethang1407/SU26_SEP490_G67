package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AppendStorageFloorRequest {

    @NotBlank(message = "Khu vực không được để trống")
    @Size(max = 50, message = "Khu vực tối đa 50 ký tự")
    String zone;

    /** SM | MD | LG — tuỳ chọn; mặc định theo ô cuối khu hoặc MD. */
    @Size(max = 10, message = "Kích thước tối đa 10 ký tự")
    String size;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
