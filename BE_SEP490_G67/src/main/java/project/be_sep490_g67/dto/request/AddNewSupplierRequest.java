package project.be_sep490_g67.dto.request;


import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;
import project.be_sep490_g67.entity.Category;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddNewSupplierRequest {

    @NotBlank(message = "Tên nhà cung cấp không được để trống")
    @Size(max = 150, message = "Tên nhà cung cấp không được vượt quá 150 ký tự")
    String name;

    @Size(max = 100, message = "Người liên hệ không được vượt quá 100 ký tự")
    String contactPerson;

    /** Chỉ dùng khi cập nhật để hiển thị; khi thêm mới hệ thống tự sinh mã. */
    @Size(max = 30, message = "Mã nhà cung cấp không được vượt quá 30 ký tự")
    String supplierCode;

    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    String address;

    @Size(max = 15, message = "Số điện thoại không được vượt quá 15 ký tự")
    String phoneNumber;

    @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
    String notes;

    Set<Category> categories;

}
