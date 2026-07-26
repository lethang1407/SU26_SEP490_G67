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
public class CreateCustomerRequest {
    @NotBlank(message = "Tên khách hàng không được để trống")
    String fullName;

    @Pattern(
            regexp = "^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-46-9])\\d{7}$",
            message = "Số điện thoại không hợp lệ"
    )
    String phoneNumber;

    String address;
    String note;
}
