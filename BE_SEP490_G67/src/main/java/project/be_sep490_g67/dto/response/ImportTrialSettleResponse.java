package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportTrialSettleResponse {

    Integer id;
    Integer importOrderId;
    String orderCode;
    BigDecimal payableAmount;
    BigDecimal discountAmount;
    BigDecimal paidAmount;
    BigDecimal remainingDebt;
    Instant settledAt;
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
        String decision;
        Integer receivedQty;
        Integer countedRemainingQty;
        Integer unsellableQty;
        Integer returnedQty;
        Integer payableQty;
        BigDecimal payableAmount;
        String unitName;
        String baseUnitName;
    }
}
