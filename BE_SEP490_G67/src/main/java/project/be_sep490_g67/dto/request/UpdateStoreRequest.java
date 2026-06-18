package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateStoreRequest {
    @NotBlank(message = "Tên hộ kinh doanh không được để trống")
    String storeName;

    @NotBlank(message = "Tên người đại diện pháp luật không được để trống")
    String ownerFullName;

    @NotBlank(message = "Địa chỉ kinh doanh không được để trống")
    String address;

    @NotBlank(message = "Mã số thuế không được để trống")
    @Pattern(
            regexp = "^\\d{10}(?:-\\d{3})?$",
            message = "Sai định dạng mã số thuế"
    )
    String taxCode;
}
