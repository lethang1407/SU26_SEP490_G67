package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductSearchResponse {
    Integer id;
    String name;
    String barcode;
    BigDecimal sellingPrice;
    Integer primarySaleLocationId;
    String primarySaleLocationLabel;
    List<ProductUnitInfo> productUnits;
    List<StockBatchInfo> stockBatches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductUnitInfo {
        Integer id;
        String name;
        BigDecimal unitBase;   // 1.0 = base unit
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockBatchInfo {
        Integer id;
        String batchCode;
        Integer quantity;
        String expiryDate;
    }
}
