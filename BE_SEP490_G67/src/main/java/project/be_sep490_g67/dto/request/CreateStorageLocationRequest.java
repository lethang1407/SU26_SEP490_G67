package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateStorageLocationRequest {

    @NotBlank(message = "Khu vực không được để trống")
    @Size(max = 50, message = "Khu vực tối đa 50 ký tự")
    String zone;

    /** Tầng (số nguyên dương), map cột shelf. */
    @NotBlank(message = "Tầng không được để trống")
    @Pattern(regexp = "^[1-9]\\d*$", message = "Tầng phải là số nguyên dương")
    @Size(max = 20, message = "Tầng tối đa 20 ký tự")
    String shelf;

    /** Số ô trên tầng (bắt đầu từ 1), map cột bin. */
    @NotBlank(message = "Số ô không được để trống")
    @Pattern(regexp = "^[1-9]\\d*$", message = "Số ô phải là số nguyên dương")
    @Size(max = 20, message = "Số ô tối đa 20 ký tự")
    String bin;

    /** SM | MD | LG */
    @NotBlank(message = "Kích thước ô không được để trống")
    @Size(max = 10, message = "Kích thước tối đa 10 ký tự")
    String size;

    /** Nếu trống, BE tự sinh ZONE-T{shelf}-O{bin}. */
    @Size(max = 50, message = "Mã vị trí tối đa 50 ký tự")
    String label;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
