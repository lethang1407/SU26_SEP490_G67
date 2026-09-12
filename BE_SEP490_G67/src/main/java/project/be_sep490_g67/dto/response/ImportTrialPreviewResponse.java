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
public class ImportTrialPreviewResponse {

    Integer importOrderId;
    String orderCode;
    LocalDate receivedDate;
    Integer supplierId;
    String supplierName;
    boolean hasOpenTrial;
    /** Nợ tiền hiện tại của phiếu (totalCost − đã trả), đã gồm bán thử OPEN nếu đã ghi lúc nhập. */
    BigDecimal remainingDebt;
    /** Giá trị bán thử OPEN đang nằm trong totalCost (line_total), dùng để điều chỉnh khi chốt. */
    BigDecimal bookedOpenTrialAmount;
    BigDecimal paidAmount;
    BigDecimal estimatedPayableIfReturnRest;
    BigDecimal estimatedPayableIfKeepAll;
    List<Line> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {
        Integer importOrderDetailId;
        Integer productId;
        String productName;
        String unitName;
        /** ĐVT cơ bản (chai/gói) — tồn, đã bán, đếm tay, hỏng. */
        String baseUnitName;
        BigDecimal unitBase;
        /** Số lượng nhận theo ĐVT trên phiếu. */
        Integer receivedQty;
        /** Số lượng nhận quy ra ĐVT cơ bản. */
        Integer receivedBaseQty;
        /** Tồn hệ thống theo ĐVT cơ bản. */
        Integer systemRemainingQty;
        /** Đã bán theo ĐVT cơ bản. */
        Integer suggestedSoldQty;
        BigDecimal costPerUnit;
        String trialStatus;
        BigDecimal estimatedPayableIfReturnRest;
        BigDecimal estimatedPayableIfKeepAll;
    }
}
