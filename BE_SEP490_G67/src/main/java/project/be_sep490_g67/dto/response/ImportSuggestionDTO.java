package project.be_sep490_g67.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportSuggestionDTO {
    Integer productId;
    String productName;
    Integer parentId;
    String parentName;
    String sku;
    String barcode;
    String productImg;
    String primaryAttrVal;
    String secondaryAttrVal;
    String whyFacts;
    String whyResult;
    Integer suggestedQty;
    Boolean orderToday;
    Integer supplierId;
    String supplierName;
    Integer leadTimeDays;
    Integer coverDays;
    /** PANEL | PRODUCT | CATEGORY | STORE */
    String coverSource;
    String coverSourceLabel;
    BigDecimal costPerUnit;
    Integer onHand;
    Integer minStock;
    Integer sold14Days;
    BigDecimal avgDailyRate;
    String unitName;
    List<SupplierOption> supplierOptions;
    List<UnitOption> units;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SupplierOption {
        Integer id;
        String name;
        Integer leadTimeDays;
        BigDecimal costPerUnit;
        Boolean cheapest;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class UnitOption {
        Integer id;
        String name;
        BigDecimal unitBase;
        @JsonProperty("isBase")
        Boolean isBase;
    }
}
