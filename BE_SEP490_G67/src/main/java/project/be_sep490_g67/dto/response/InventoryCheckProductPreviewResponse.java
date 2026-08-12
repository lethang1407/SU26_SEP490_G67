package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryCheckProductPreviewResponse {
    Integer productId;
    String productCode;
    String productName;
    String unit;
    Integer systemQty;
    BigDecimal importPrice;

    @Builder.Default
    List<BatchOption> batches = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class BatchOption {
        Integer id;
        String batchCode;
        Integer quantity;
        String expiryDate;
        Integer importOrderId;
        Integer supplierId;
        String supplierName;
    }
}
