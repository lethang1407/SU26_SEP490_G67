package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StoreResponse {
    Integer id;
    String storeName;
    String ownerFullName;
    String address;
    String taxCode;
//    BigDecimal taxRate;
}
