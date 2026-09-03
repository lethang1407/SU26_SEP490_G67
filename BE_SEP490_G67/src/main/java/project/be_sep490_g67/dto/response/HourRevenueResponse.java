package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Doanh thu bán hàng của một khung giờ trong ngày.
 */
@Data
@Builder
public class HourRevenueResponse {
    /**
     * 0..23 theo giờ Việt Nam.
     */
    private int hour;
    /**
     * Nhãn hiển thị, ví dụ "08h".
     */
    private String label;
    /**
     * Doanh thu đã trừ hàng khách trả trong khung giờ này. Có thể âm.
     */
    private BigDecimal revenue;
    /**
     * Doanh thu gộp tại thời điểm bán, chưa trừ hàng trả.
     */
    private BigDecimal grossRevenue;
    /**
     * Giá trị hàng khách trả lại trong khung giờ này.
     */
    private BigDecimal refundAmount;
    private long orderCount;
}
