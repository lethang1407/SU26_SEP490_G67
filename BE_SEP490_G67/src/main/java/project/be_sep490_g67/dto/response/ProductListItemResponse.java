package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductListItemResponse {
    Integer id;
    Integer parentId;
    String parentName;
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
    Integer sold14Days;
    Integer onHand;
    Double coverDaysLeft;
    /** hot | slow | warn | season | ok | stop | new */
    String facetStatus;
    String status;          // active | inactive
    Instant createdAt;
    boolean isGroup;        // true nếu sản phẩm cha có biến thể con
    Integer childCount;     // số biến thể con
    /** Đơn DRAFT mới nhất chứa SP này (null = chưa có phiếu tạm) */
    Integer openPoId;
    String openPoCode;
    Integer openPoQty;
    List<ProductListItemResponse> children;
}
