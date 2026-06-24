package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import project.be_sep490_g67.entity.Category;
import project.be_sep490_g67.entity.User;

import java.time.Instant;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddNewSupplierResponse {
    String name;
    String contactPerson;
    String supplierCode;
    String address;
    String phoneNumber;
    String notes;
    Set<Category> categories;
    Instant createdAt;
    User createdBy;
}
