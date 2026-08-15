package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Thẻ "Kho hàng" trên dashboard: ba nhóm việc cần chú ý, mỗi nhóm mang mức độ nghiêm
 * trọng đã tính sẵn ở backend.
 *
 * <p>Mức mặc định theo loại vấn đề — hết hạn đỏ, hết hàng cam, hàng đổi trả chờ xử lý
 * vàng — nhưng có thể leo thang theo sản lượng bán và theo thời gian nằm chờ. Mức của
 * một nhóm KHÔNG đổi chỉ vì nhóm khác vắng mặt.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InventoryAttentionResponse {

    /** Tổng số việc của cả ba nhóm — con số trên badge của thẻ. */
    int totalCount;

    InventoryAttentionGroupResponse expired;
    InventoryAttentionGroupResponse outOfStock;
    InventoryAttentionGroupResponse returnHold;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class InventoryAttentionGroupResponse {
        int count;
        /** RED | ORANGE | YELLOW */
        String severity;
        /** Lý do leo thang, null nếu đang ở mức mặc định của loại vấn đề. */
        String severityReason;
        /** Vài dòng tiêu biểu để hiện ngay trên thẻ. */
        List<InventoryAttentionItemResponse> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class InventoryAttentionItemResponse {
        Integer productId;
        String productName;
        /** Mô tả ngắn để hiện dưới tên SP trên thẻ. */
        String detail;
    }
}
