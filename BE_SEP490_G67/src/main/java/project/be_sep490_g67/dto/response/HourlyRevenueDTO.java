package project.be_sep490_g67.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** Doanh thu bán hàng của một khung giờ trong ngày. */
@Data
@Builder
public class HourlyRevenueDTO {
    /** 0..23 theo giờ Việt Nam. */
    private int hour;
    /** Nhãn hiển thị, ví dụ "08h". */
    private String label;
    private BigDecimal revenue;
    private long orderCount;
}
