package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Thẻ "Khách hàng &amp; Công nợ" trên dashboard: đơn ghi nợ do nhân viên lập trong ngày
 * cho khách đã có hồ sơ trong hệ thống.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffDebtSalesAlertResponse {
    long count;

    /**
     * Tổng nợ còn lại của những đơn này, không phải tổng giá trị đơn.
     */
    BigDecimal totalRemainingDebt;

    Integer latestOrderId;
    String latestOrderCode;
    Integer latestCustomerId;
    String latestCustomerName;
    BigDecimal latestRemainingDebt;
    String latestStaffName;
    Instant latestCreatedAt;
}
