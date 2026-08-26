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
public class GroupedSuggestionDTO {
    Integer id;
    String name;
    String sku;
    String barcode;
    String productImg;
    String categoryName;
    String unitName;
    String supplierName;
    BigDecimal sellingPrice;
    BigDecimal costPrice;

    // Aggregated or standalone metrics
    Integer onHand;
    BigDecimal avgDailyRate;
    BigDecimal avgWeeklyRate;
    Double coverDaysLeft;
    String facetStatus;

    Boolean isGroup;

    // Open DRAFT Import Order (Phiếu tạm) info if exists
    Integer openPoId;
    String openPoCode;
    Integer openPoQty;

    List<VariantGroupDTO> variantGroups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class VariantGroupDTO {
        String primaryAttrValue; // e.g. "Vàng"
        String name; // e.g. "Dép tổ ong siêu nhẹ đại của thanh - Màu Vàng"
        String sku; // e.g. "SP000003..." or "(2 mã)"
        String productImg;
        BigDecimal sellingPrice;
        BigDecimal costPrice;
        Integer onHand;
        BigDecimal avgDailyRate;

        List<VariantItemDTO> sizes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class VariantItemDTO {
        Integer id; // actual product ID
        String name;
        String primaryAttrValue;
        String sizeValue; // secondary attribute value, e.g. "Size 36"
        String sku;
        String barcode;
        String productImg;
        Integer onHand;
        BigDecimal sellingPrice;
        BigDecimal costPrice;
        BigDecimal avgDailyRate;
        BigDecimal avgWeeklyRate;

        Integer suggestedQty;
        Boolean orderToday;
        String whyFacts;
        String whyResult;
        Integer leadTimeDays;
        Integer coverDays;
        String coverSource;
        String coverSourceLabel;
        BigDecimal costPerUnit;

        // Open DRAFT Import Order (Phiếu tạm) info if exists
        Integer openPoId;
        String openPoCode;
        Integer openPoQty;

        List<ImportSuggestionDTO.SupplierOption> supplierOptions;
        List<ImportSuggestionDTO.UnitOption> units;
    }
}
