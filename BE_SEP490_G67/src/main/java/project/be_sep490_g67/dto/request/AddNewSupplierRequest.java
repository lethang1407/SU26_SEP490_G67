package project.be_sep490_g67.dto.request;


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
    String name;
    String contactPerson;
    String supplierCode;
    String address;
    String phoneNumber;
    String notes;
    Set<Category> categories;

}
