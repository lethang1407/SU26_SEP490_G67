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
public class WarehouseIoLineDTO {
    Instant occurredAt;
    String documentCode;
    String originalDocumentCode;
    /** IMPORT_ORDER | SALES_ORDER | EXCHANGE_ORDER | RETURN_ORDER | IMPORT_RETURN | STOCK_BATCH */
    String referenceType;
    Integer referenceId;
    /**
     * ID dùng mở popup chi tiết (vd. với đổi/trả khách là salesOrderId của hóa đơn gốc).
     */
    Integer documentId;
    /** IMPORT | SALE | IMPORT_RETURN — null nếu không mở được popup */
    String documentKind;
    String movementType;
    String direction;
    String description;
    Integer openingQty;
    BigDecimal openingAmount;
    Integer importQty;
    BigDecimal importAmount;
    Integer exportQty;
    BigDecimal exportAmount;
    Integer closingQty;
    BigDecimal closingAmount;
}
