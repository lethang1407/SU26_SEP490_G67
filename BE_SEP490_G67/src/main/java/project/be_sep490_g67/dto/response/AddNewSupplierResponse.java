package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddNewSupplierResponse {
    /** Id NCC vừa tạo — FE dùng để chọn luôn NCC này, không phải tìm lại. */
    Integer id;
    String name;
    String contactPerson;
    String supplierCode;
    String address;
    String phoneNumber;
    String notes;
    List<CategoryResponse> categories;
    Instant createdAt;
    Integer createdById;
    String createdByName;
}
