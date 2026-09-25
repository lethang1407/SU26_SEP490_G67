package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AppendStorageBinRequest {

    @NotBlank(message = "Khu vực không được để trống")
    @Size(max = 50, message = "Khu vực tối đa 50 ký tự")
    String zone;

    @NotBlank(message = "Tầng không được để trống")
    @Pattern(regexp = "^[1-9]\\d*$", message = "Tầng phải là số nguyên dương")
    @Size(max = 20, message = "Tầng tối đa 20 ký tự")
    String shelf;

    /** SM | MD | LG — tuỳ chọn; mặc định theo ô cuối tầng hoặc MD. */
    @Size(max = 10, message = "Kích thước tối đa 10 ký tự")
    String size;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
