package project.be_sep490_g67.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    /** ID của bản ghi người nhận, dùng khi đánh dấu đã đọc. */
    private Integer id;
    private String notificationType;
    private String title;
    private String message;
    /** Đối tượng liên quan (CUSTOMER, SALES_ORDER...) để FE điều hướng. */
    private String referenceType;
    private Integer referenceId;
    private Boolean isRead;
    private Instant createdAt;
}
