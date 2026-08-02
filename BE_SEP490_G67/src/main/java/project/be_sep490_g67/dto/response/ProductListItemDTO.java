package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductListItemDTO {
    Integer id;
    String name;
    String productImg;
    String categoryName;
    String unitName;
    BigDecimal avgDailyRate;
    BigDecimal avgWeeklyRate;
    Integer onHand;
    Double coverDaysLeft;
    /** hot | slow | warn | season | ok | stop */
    String facetStatus;
}
