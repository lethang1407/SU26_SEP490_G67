package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomerResponse {
    Integer id;
    String fullName;
    String phoneNumber;
    String address;
    String debtStatus;
    Boolean allowDebt;
    BigDecimal totalDebt;
    String note;
}
