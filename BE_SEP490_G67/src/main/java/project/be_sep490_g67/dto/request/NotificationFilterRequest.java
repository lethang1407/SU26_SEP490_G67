package project.be_sep490_g67.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Bộ lọc hộp thông báo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationFilterRequest {

    /** Nhiều loại là quan hệ HOẶC: trả về thông báo thuộc một trong các loại này. */
    private List<String> types;

    /** {@code null} = cả đã đọc lẫn chưa đọc. */
    private Boolean isRead;

    /** Tính theo ngày giờ cửa hàng (Asia/Ho_Chi_Minh), lấy trọn ngày này. */
    private LocalDate from;

    /** Tính theo ngày giờ cửa hàng (Asia/Ho_Chi_Minh), lấy trọn ngày này. */
    private LocalDate to;

    /** Bộ lọc rỗng - dùng cho đường gọi cũ không có bộ lọc. */
    public static NotificationFilterRequest empty() {
        return new NotificationFilterRequest();
    }

    public boolean hasTypes() {
        return types != null && !types.isEmpty();
    }
}
