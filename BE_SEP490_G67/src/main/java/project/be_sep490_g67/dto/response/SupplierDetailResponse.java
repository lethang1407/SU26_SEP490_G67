package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierDetailResponse {
    Integer id;
    String supplierCode;
    String name;
    String contactPerson;
    String phoneNumber;
    String address;
    String notes;
    List<CategoryResponse> categories;
    BigDecimal currentDebt;
}
