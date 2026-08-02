package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportSuggestionDTO {
    Integer productId;
    String productName;
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
    BigDecimal avgDailyRate;
}
