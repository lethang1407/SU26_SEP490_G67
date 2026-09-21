package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderDetailResponse {
    Integer id;
    String orderCode;
    LocalDate receivedDate;
    Instant receivedAt;
    String createdByName;

    Integer supplierId;
    String supplierCode;
    String supplierName;

    /** DRAFT | IMPORTED */
    String orderStatus;

    /** Trạng thái thanh toán derive: DEBT | DONE (giữ tên status cho modal NCC). */
    String status;

    /** Tổng tiền hàng = giá trị nhận (thường + bán thử qty×giá, không gồm KM). */
    BigDecimal goodsTotal;
    /** Giá trị bán thử chưa quyết toán — đã gồm trong totalCost / công nợ. */
    BigDecimal openTrialAmount;
    /** Tổng phải trả sau khi đã chốt các dòng bán thử (0 nếu trả hết hàng). */
    BigDecimal settledTrialAmount;
    BigDecimal discountAmount;
    /** Cần trả NCC (= total_cost), gồm bán thử OPEN. */
    BigDecimal totalCost;
    BigDecimal returnDeductionAmount;
    BigDecimal supplierRefundAmount;
    BigDecimal paidAmount;
    BigDecimal remainingDebt;

    String note;

    /** URL ảnh hóa đơn / phiếu giao hàng (Cloudinary). */
    String invoiceImage;

    List<ImportOrderItemResponse> items;
    List<ImportOrderReturnLineResponse> returnLines;
    List<ImportTrialSettleResponse> trialSettlements;

    /** Có dòng bán thử chưa quyết toán. */
    Boolean hasOpenTrial;
}
