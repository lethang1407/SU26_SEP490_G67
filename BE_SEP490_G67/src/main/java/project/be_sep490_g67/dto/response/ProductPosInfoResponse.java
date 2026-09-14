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
    /** Tổng tồn bán được (toàn kho trừ RETURN_HOLD). */
    Integer availableQuantity;
    /** @deprecated Đã gộp khu bán/kho; luôn 0 để tương thích FE cũ. */
    Integer salesZoneQuantity;
    /** Tồn bán được (cùng availableQuantity sau khi gộp khu). */
    Integer warehouseQuantity;
    Integer minStock;
    Boolean belowMinStock;

    /** Null = POS trừ FEFO; chỉ set khi thu ngân chọn ô tường minh. */
    Integer defaultLocationId;
    /** Null cùng defaultLocationId khi đi FEFO. */
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
     * Một dòng = một lô tại một ô. Một ô có thể chứa nhiều lô / nhiều SP.
     */
    public static class LocationStockInfo {
        Integer locationId;
        String label;
        String zoneCode;
        /** WAREHOUSE | RETURN_HOLD (SALES đã normalize → WAREHOUSE) */
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
