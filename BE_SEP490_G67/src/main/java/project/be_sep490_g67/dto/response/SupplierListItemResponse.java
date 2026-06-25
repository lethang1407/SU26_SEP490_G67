package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierListItemResponse {
    Integer id;
    String supplierCode;
    String name;
    String phoneNumber;
    String address;
    BigDecimal currentDebt;
}
