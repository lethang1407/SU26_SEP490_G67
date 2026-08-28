package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Widget "Sản phẩm cần quyết định nhập hàng" trên dashboard.
 *
 * <p>Chỉ chứa sản phẩm đang có dấu hiệu cần quan tâm (tồn <= ngưỡng tối thiểu, kể cả
 * hết hàng). Hàng tồn bình thường không xuất hiện.
 */
@Data
@Builder
public class RestockAdviceResponse {

    /**
     * Số ngày của cửa sổ đánh giá sản lượng bán.
     */
    private int windowDays;

    private Summary summary;

    @Builder.Default
    private List<Item> items = new ArrayList<>();

    @Data
    @Builder
    public static class Summary {
        private long priorityRestockCount;
        private long reviewCount;
        private long slowMovingCount;
        /**
         * Tổng số sản phẩm cần quan tâm — số hiện ở nút "Xem tất cả".
         */
        private long totalCount;
    }

    @Data
    @Builder
    public static class Item {
        private Integer productId;
        private String productName;
        private String sku;

        /**
         * Đơn vị nhỏ nhất, mọi con số *Base bên dưới đều tính theo đơn vị này.
         */
        private String baseUnitName;
        /**
         * Đơn vị lớn nhất để hiển thị cho dễ đọc (thùng), null nếu SP chỉ có một đơn vị.
         */
        private String displayUnitName;
        /**
         * Một đơn vị hiển thị bằng bao nhiêu đơn vị cơ sở.
         */
        private Integer displayUnitBase;

        private long currentStockBase;
        private long minStockBase;
        /**
         * Bán ròng trong kỳ: đã trừ hàng khách trả lại. Không âm.
         */
        private long soldInWindowBase;

        private String currentStockText;
        private String minStockText;
        /**
         * Gộp tồn và ngưỡng, đơn vị viết một lần: "0 / 10 thùng".
         */
        private String stockRatioText;
        private String soldInWindowText;

        private Instant lastSoldAt;
        /**
         * Số ngày kể từ lần bán gần nhất; null nếu sản phẩm chưa từng bán.
         */
        private Long daysSinceLastSale;

        /**
         * NCC đã nhập sản phẩm này gần nhất; rơi về NCC mặc định của danh mục khi sản
         * phẩm chưa từng được nhập. Null nếu không suy ra được từ đâu cả.
         */
        private String supplierName;

        private String stockState;
        private String stockStateLabel;

        private String priority;
        private String priorityLabel;
        /**
         * RED | ORANGE | GRAY — màu badge phía FE.
         */
        private String priorityTone;
        /**
         * Câu giải thích vì sao xếp mức này, hiện ở tooltip/dòng phụ.
         */
        private String reason;

        private String action;
        private String actionLabel;
    }
}
