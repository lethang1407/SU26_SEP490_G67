package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Một dòng trong danh sách hiện ra khi bấm "sản phẩm đã hết hàng" trên thẻ "Kho hàng".
 * Hết hàng = tồn trên mọi ô kho (kể cả ô nhập hàng) bằng 0, không tính khu đổi trả —
 * cùng câu truy vấn với con số trên thẻ nên số dòng luôn khớp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OutOfStockProductResponse {

    Integer productId;
    String productName;
    String productSku;
    String categoryName;

    /** Định mức tồn tối thiểu, có thể null nếu chưa đặt. */
    Integer minStock;

    /** Số lượng đã bán trong {@code windowDays} ngày gần nhất — để biết hàng nào cần nhập gấp. */
    int soldInWindow;
    int windowDays;

    /** Bán chạy (soldInWindow ≥ ngưỡng cấu hình): cùng tiêu chí làm thẻ chuyển đỏ. */
    boolean highVolume;

    /**
     * Đơn nhập nháp (DRAFT) mới nhất đang có SP này, null nếu không có — pop-up chuẩn bị đơn
     * nhập cảnh báo trước để khỏi đặt trùng, giống trang Sản phẩm.
     */
    Integer openPoId;
    String openPoCode;
    Integer openPoQty;
}
