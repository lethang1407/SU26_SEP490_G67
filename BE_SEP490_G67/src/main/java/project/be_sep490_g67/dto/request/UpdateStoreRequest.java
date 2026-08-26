package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    /**
     * Tài khoản nhận chuyển khoản.
     */
    @Pattern(
            regexp = "^$|^[A-Za-z0-9]{2,20}$",
            message = "Mã ngân hàng chỉ gồm chữ và số"
    )
    String bankId;

    @Pattern(
            regexp = "^$|^[0-9]{6,20}$",
            message = "Số tài khoản chỉ gồm chữ số, dài 6-20 ký tự"
    )
    String bankAccountNo;

    /**
     * Ngân hàng in tên thụ hưởng dạng in hoa không dấu (PHAM HUY THAI), nên chỉ
     * nhận chữ hoa, chữ số và dấu cách để tên trên mã QR khớp với tên tài khoản thật.
     */
    @Pattern(
            regexp = "^$|^[A-Z0-9 ]{5,50}$",
            message = "Tên chủ tài khoản phải viết hoa không dấu, không chứa ký tự đặc biệt, dài 5-50 ký tự"
    )
    @Size(max = 50, message = "Tên chủ tài khoản tối đa 50 ký tự")
    String bankAccountName;
}
