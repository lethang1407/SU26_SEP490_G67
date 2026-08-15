package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class SalesHistorySummaryDTO {
    private String monthLabel;
    private String todayLabel;
    private long totalQty;
    private long totalOrders;
    private BigDecimal totalRevenue;
    private BigDecimal totalProfit;

    @Builder.Default
    private List<WeekDTO> weeks = new ArrayList<>();

    private Integer productId;
    private String productName;
    private String shortName;
    private String sku;
    private String unitName;
    private String image;
    private long onHand;
    private long sold30d;
    private BigDecimal revenue30d;
    private BigDecimal profit30d;

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
