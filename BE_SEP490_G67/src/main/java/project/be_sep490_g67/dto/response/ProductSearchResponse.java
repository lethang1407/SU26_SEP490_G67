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
public class ProductSearchResponse {
    Integer id;
    String name;
    String sku;
    String barcode;
    BigDecimal sellingPrice;
    /** Giá vốn tham chiếu trên master SP (fallback khi chưa có lô). Đã theo ĐVT cơ bản. */
    BigDecimal costPrice;
    /**
     * Giá nhập gần nhất theo ĐVT cơ bản:
     * ưu tiên cost_per_unit lô mới nhất; không có lô thì = costPrice.
     */
    BigDecimal lastCostPerBase;
    /** Tổng tồn kho theo đơn vị cơ bản, gộp mọi lô và mọi vị trí. */
    Integer stockQuantity;
    /**
     * Tồn BÁN ĐƯỢC: chỉ tính hàng đang nằm ở một ô kho, đã loại khu đổi trả và lô hết hạn.
     *
     * <p>Hàng vừa nhập nhưng chưa xếp vị trí có {@code stockQuantity > 0} mà
     * {@code sellableQuantity = 0} — POS phải nhìn con số này để không cho thêm vào đơn,
     * vì checkout trừ kho theo {@code batch_locations} chứ không theo lượng nhập.
     */
    Integer sellableQuantity;
    /**
     * true nếu SP đã từng nhập kho hoặc còn lô.
     * Hàng bán thử chỉ được chọn khi false.
     */
    Boolean alreadyInStore;
    Integer parentId;
    String parentName;
    List<ProductAttributeResponse> attributes;
    List<ProductUnitInfo> productUnits;
    List<StockBatchInfo> stockBatches;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductUnitInfo {
        Integer id;
        String name;
        BigDecimal unitBase;   // 1.0 = base unit
        /** Giá bán của đúng đơn vị này (đã nhân hệ số nếu không đặt giá riêng). */
        BigDecimal sellingPrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockBatchInfo {
        Integer id;
        String batchCode;
        Integer quantity;
        String expiryDate;
    }
}
