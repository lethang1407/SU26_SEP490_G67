package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderItemResponse {
    Integer id;
    Integer productId;
    String productCode;
    String productName;
    Integer parentId;
    String parentName;
    List<ProductAttributeResponse> attributes;
    Integer productUnitId;
    /** Tên ĐVT lấy từ product_units (join), không lưu snapshot trên phiếu. */
    String unitName;
    List<ProductUnitOption> productUnits;
    Integer quantity;
    BigDecimal costPerUnit;
    /** Giá vốn gần nhất theo ĐVT cơ bản (lô mới nhất / cost_price) — dùng gợi ý & cảnh báo. */
    BigDecimal lastCostPerBase;
    /** Giá bán hiện tại — dùng cảnh báo lỗ. */
    BigDecimal sellingPrice;
    BigDecimal lineTotal;
    LocalDate expiryDate;
    String note;
    Boolean isPromotion;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ProductUnitOption {
        Integer id;
        String name;
        BigDecimal unitBase;
    }
}
