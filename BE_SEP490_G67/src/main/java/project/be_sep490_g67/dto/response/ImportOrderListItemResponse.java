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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderListItemResponse {
    Integer id;
    String orderCode;
    LocalDate receivedDate;
    /** Thời điểm ghi nhận phiếu (dùng hiển thị cột Thời gian trên list). */
    Instant receivedAt;
    String createdByName;
    BigDecimal totalCost;

    Integer supplierId;
    String supplierCode;
    String supplierName;

    /**
     * Trạng thái phiếu: DRAFT | IMPORTED
     */
    String orderStatus;

    /**
     * Trạng thái thanh toán derive: DEBT | DONE
     * (giữ tên `status` để tương thích lịch sử nhập theo NCC)
     */
    String status;

    BigDecimal paidAmount;
    /** Số tiền còn phải trả NCC cho đơn này. */
    BigDecimal remainingDebt;
}
