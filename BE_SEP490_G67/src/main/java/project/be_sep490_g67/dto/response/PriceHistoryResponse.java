package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PriceHistoryResponse {
    Integer id;
    BigDecimal price;
    Integer supplierId;
    String supplierName;
    Instant createdAt;
}
