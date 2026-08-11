package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportReturnDraftResponse {

    Integer id;
    String status;
    String source;
    Integer inventoryCheckId;
    String returnCode;
    BigDecimal totalRefund;
    String note;
    List<Line> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {
        Integer detailId;
        Integer stockBatchId;
        String batchCode;
        Integer productId;
        String productCode;
        String productName;
        Integer quantity;
        BigDecimal returnPrice;
        String returnReason;
        Integer supplierId;
        String supplierName;
        Integer importOrderId;
        Integer maxQuantity;
    }
}
