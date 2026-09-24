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

    /**
     * Tầng (tuỳ chọn). Để trống = vị trí đơn giản (chỉ cần mã vị trí).
     * Nếu nhập thì phải là số nguyên dương.
     */
    @Pattern(regexp = "^$|^[1-9]\\d*$", message = "Tầng phải là số nguyên dương")
    @Size(max = 20, message = "Tầng tối đa 20 ký tự")
    String shelf;

    /**
     * Số ô (tuỳ chọn). Đi kèm tầng khi dùng mô hình kệ. Giá trị 1–10.
     */
    @Pattern(regexp = "^$|^([1-9]|10)$", message = "Số ô phải từ 1 đến 10")
    @Size(max = 2, message = "Số ô tối đa là 10")
    String bin;

    /** SM | MD | LG — tuỳ chọn, mặc định MD. */
    @Size(max = 10, message = "Kích thước tối đa 10 ký tự")
    String size;

    /**
     * Mã vị trí. Bắt buộc với vị trí đơn giản; nếu trống và có tầng/ô thì BE tự sinh.
     */
    @Size(max = 50, message = "Mã vị trí tối đa 50 ký tự")
    String label;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
