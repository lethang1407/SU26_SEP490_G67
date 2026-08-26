package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Thẻ "Khách hàng & Công nợ" trên dashboard: khách nợ mới do nhân viên thêm trong ngày.
 * {@code count} là số khách như vậy, các trường còn lại mô tả khách mới nhất (null khi
 * không có khách nào).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NewDebtCustomerAlertResponse {
    long count;
    Integer latestCustomerId;
    String latestCustomerName;
    BigDecimal latestCustomerDebt;
    String latestCreatedByName;
    /** Thời điểm khách mới nhất được thêm, để thẻ dashboard hiện giờ tạo. */
    Instant latestCreatedAt;
}
