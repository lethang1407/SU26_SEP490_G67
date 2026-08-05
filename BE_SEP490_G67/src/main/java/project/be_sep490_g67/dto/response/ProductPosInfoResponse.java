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
    Integer availableQuantity;
    Integer minStock;
    Boolean belowMinStock;

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
    public static class LocationStockInfo {
        Integer locationId;
        String label;
        Integer quantity;
        String nearestExpiryDate;
    }
}
