package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ImportHistorySummaryDTO {
    private String monthLabel;
    private String todayLabel;
    private long totalQty;
    private long totalOrders;
    private BigDecimal totalCost;

    @Builder.Default
    private List<WeekDTO> weeks = new ArrayList<>();

    /** Present when productId filter is set */
    private Integer productId;
    private String productName;
    private String sku;
    private String unitName;
    private Instant lastImportedAt;
    private BigDecimal avgUnitPrice;

    @Data
    @Builder
    public static class WeekDTO {
        private String id;
        private String weekLabel;
        private String dateRange;
        private long orderCount;
        private BigDecimal amount;
        private boolean isCurrent;
    }
}
