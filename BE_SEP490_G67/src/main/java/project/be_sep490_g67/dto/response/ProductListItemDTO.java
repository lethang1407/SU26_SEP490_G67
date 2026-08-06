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
    String sku;
    String barcode;
    String productImg;
    String categoryName;
    String unitName;
    String supplierName;
    String description;
    BigDecimal sellingPrice;
    BigDecimal costPrice;
    Integer coverDaysOverride;
    Integer categoryCoverDays;
    BigDecimal avgDailyRate;
    BigDecimal avgWeeklyRate;
    Integer onHand;
    Double coverDaysLeft;
    /** hot | slow | warn | season | ok | stop */
    String facetStatus;
    /** Đơn DRAFT mới nhất chứa SP này (null = chưa có phiếu tạm) */
    Integer openPoId;
    String openPoCode;
    Integer openPoQty;
}
