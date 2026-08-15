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

    /** Tổng tiền hàng = SUM(line_total), trước giảm giá. */
    BigDecimal goodsTotal;
    BigDecimal discountAmount;
    /** Cần trả NCC = max(goodsTotal - discount - hàng trả, 0) (= total_cost). */
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
}
