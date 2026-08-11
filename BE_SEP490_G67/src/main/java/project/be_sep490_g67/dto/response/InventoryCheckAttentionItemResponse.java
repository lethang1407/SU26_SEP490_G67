package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryCheckAttentionItemResponse {
    Integer productId;
    String productCode;
    String productName;
    Integer batchId;
    String batchCode;
    String reason;
    /** EXPIRED | EXPIRING_SOON | NOT_CHECKED_RECENTLY */
    String reasonCode;
    String expiryDate;
    Integer quantity;
}
