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
public class RevenueReportOverviewResponse {

    //KPI summary
    Summary summary;

    // Trend chart data (monthly or quarterly)
    List<PeriodPoint> series;

    // Payment method breakdown
    List<PaymentBreakdown> paymentBreakdowns;

    // Đã thu thực / còn ghi nợ — tab PTTT
    PaymentSummary paymentSummary;

    // Doanh thu theo PTTT từng tháng — tab PTTT
    List<PaymentSeriesPoint> paymentSeries;

    // Adjustments (returns & discounts)
    AdjustmentSummary adjustments;

    // Highlights / insights
    List<Highlight> highlights;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Summary {
        BigDecimal grossRevenue;       // tiền hàng Σ(đơn giá × SL), trước CK và trả hàng
        BigDecimal netRevenue;
        Double netRevenueChangePct;    // null = chưa có kỳ trước

        BigDecimal profit;
        Double profitChangePct;

        Double profitMarginPct;

        BigDecimal averageOrderValue;
        Long orderCount;               // số đơn có doanh thu thực (totalAmount > 0)
        Double orderCountChangePct;
        Long invoiceCount;             // = orderCount, giữ cho tương thích
        BigDecimal maxOrderValue;
        BigDecimal minOrderValue;

        BigDecimal cogs;

        BigDecimal returnAmount;
        Double returnRatePct;

        BigDecimal discountAmount;
        Double discountRatePct;

        String bestPeriodLabel;
        String worstPeriodLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PeriodPoint {
        String label;                  // "T1", "T2", ... or "Q1", ...
        BigDecimal netRevenue;
        BigDecimal cogs;
        BigDecimal profit;
        Double profitMarginPct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PaymentBreakdown {
        String paymentMethod;          // TRANSFER | CASH | DEBT
        Long invoiceCount;
        BigDecimal grossRevenue;
        BigDecimal netRevenue;
        Double ratioPct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PaymentSummary {
        BigDecimal collectedAmount;    // doanh thu thuần − phần còn nợ
        BigDecimal outstandingDebt;    // nợ còn lại của các đơn bán nợ trong kỳ
        Long debtOrderCount;           // số đơn bán nợ trong kỳ còn nợ
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PaymentSeriesPoint {
        String label;
        BigDecimal transfer;
        BigDecimal cash;
        BigDecimal debt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class AdjustmentSummary {
        BigDecimal returnAmount;
        Double returnRatePct;
        BigDecimal discountAmount;
        Double discountRatePct;
        List<ReturnReasonRow> topReturnReasons;
        List<ReturnSlip> returnSlips;  // Phiếu trả hàng
        List<MonthlyReturnPoint> monthlyReturns;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ReturnReasonRow {
        String reason;
        Long count;
        BigDecimal amount;
        Double ratioPct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ReturnSlip {
        Integer returnId;
        String returnCode;
        Instant createdAt;
        String customerName;
        BigDecimal refundAmount;
        String reason;
        List<ReturnSlipItem> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ReturnSlipItem {
        String productName;
        Integer quantity;
        String unitName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MonthlyReturnPoint {
        String label;
        BigDecimal refundAmount;
        Double returnRatePct;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Highlight {
        String tone;       // "positive" | "warning"
        String message;
        String recommendation;
    }
}
