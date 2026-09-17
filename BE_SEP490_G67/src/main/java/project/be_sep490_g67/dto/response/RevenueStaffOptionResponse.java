package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Một lựa chọn trong dropdown "Nhân viên bán hàng" của báo cáo doanh thu.
 * Gồm cả chủ cửa hàng, vì chủ cũng trực tiếp bán tại quầy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueStaffOptionResponse {
    Integer id;
    String name;
    boolean owner;      // true = chủ cửa hàng (chỉ có role MANAGER)
}
