package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SalesOrderListResponse {

    List<Item> content;
    int page;
    int size;
    long totalElements;
    int totalPages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        Integer id;
        String orderCode;
        /**
         * Phiếu trả và đơn đổi phát sinh từ hóa đơn gốc
         */
        List<RelatedDocument> relatedDocuments;
        Instant createdAt;
        String customerName;    // null → "Khách lẻ"
        String customerPhone;   // null → "Khách lẻ"
        BigDecimal totalAmount;
        String orderStatus;
        String paymentMethod;
        /** Nhân viên lập hóa đơn (createdBy); "—" nếu không xác định được. */
        String staffName;
        Boolean isDebt;
        Boolean isCheckDebtUnstable;
        Instant dueDate;
        BigDecimal remainingDebt;
        String debtStatus;
    }

    /** chứng từ đổi/trả gắn với hóa đơn gốc. */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedDocument {
        Integer id;
        String code;
        /** RETURN = phiếu trả hàng, EXCHANGE = hóa đơn hàng lấy mới. */
        String type;
        Instant createdAt;
        BigDecimal amount;
    }
}
