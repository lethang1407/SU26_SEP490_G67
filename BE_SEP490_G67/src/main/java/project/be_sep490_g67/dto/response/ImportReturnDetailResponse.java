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
public class ImportReturnDetailResponse {

    Integer id;
    String returnCode;
    String status;
    String source;
    Integer inventoryCheckId;
    BigDecimal totalRefund;
    String note;
    String createdByName;
    String createdAt;
    Integer itemCount;
    Integer totalQuantity;
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
        BigDecimal lineValue;
        String returnReason;
        String note;
        String method;
        String lineStatus;
        Integer supplierId;
        String supplierName;
        Integer importOrderId;
        Integer maxQuantity;
        Integer exchangeBatchId;
        String exchangeBatchCode;
    }
}
