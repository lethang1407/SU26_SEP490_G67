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
public class ProductBarcodeResponse {
    Integer id;
    String name;
    String barcode;
    BigDecimal sellingPrice;
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
        /** Giá bán của đúng đơn vị này (đã nhân hệ số nếu không đặt giá riêng). */
        BigDecimal sellingPrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockBatchInfo {
        Integer id;
        String batchCode;      // composed from import order or batch id
        Integer quantity;
        String expiryDate;
    }
}
