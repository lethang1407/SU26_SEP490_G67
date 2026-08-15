package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderReturnLineResponse {
    Integer detailId;
    Integer returnId;
    String returnCode;
    Integer productId;
    String productName;
    String method;
    Integer quantity;
    BigDecimal returnPrice;
    BigDecimal lineValue;
    String batchCode;
    String returnReason;
    String lineStatus;
    boolean attached;
}
