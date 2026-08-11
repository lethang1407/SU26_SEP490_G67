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
public class ProductPosInfoResponse {
    Integer id;
    String name;
    String barcode;
    String categoryName;
    String description;
    BigDecimal sellingPrice;
    /** Tổng tồn toàn hệ thống (khu bán + kho). */
    Integer availableQuantity;
    /** Tồn đang nằm trên các khu bán. */
    Integer salesZoneQuantity;
    /** Tồn còn trong kho, chưa ra quầy. */
    Integer warehouseQuantity;
    Integer minStock;
    Boolean belowMinStock;

    /** Ô lấy hàng POS chọn sẵn — null khi SP chưa được đưa ra khu bán. */
    Integer defaultLocationId;
    /** Lô suy ra từ ô mặc định. Một ô khu bán chỉ chứa một lô nên luôn xác định. */
    Integer defaultBatchId;

    List<UnitInfo> units;
    List<LocationStockInfo> locations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnitInfo {
        Integer id;
        String name;
        BigDecimal unitBase;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    /**
     * Một dòng = một lô tại một ô. Không gộp theo ô, vì một ô kho có thể chứa
     * nhiều lô của cùng sản phẩm (ràng buộc một-lô-một-ô chỉ áp cho khu bán).
     */
    public static class LocationStockInfo {
        Integer locationId;
        String label;
        String zoneCode;
        /** SALES | WAREHOUSE */
        String zoneType;
        Boolean locationFull;
        Integer batchId;
        String batchCode;
        /** ISO-8601, có thể null. */
        String receivedDate;
        /** ISO-8601, có thể null. */
        String expiryDate;
        Integer quantity;
    }
}
