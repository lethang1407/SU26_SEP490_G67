package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "Mã vị trí không được để trống")
    @Size(max = 50, message = "Mã vị trí tối đa 50 ký tự")
    String label;

    @Size(max = 20, message = "Lối đi tối đa 20 ký tự")
    String aisle;

    @Size(max = 20, message = "Kệ tối đa 20 ký tự")
    String shelf;

    @Size(max = 20, message = "Ô tối đa 20 ký tự")
    String bin;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    String description;
}
