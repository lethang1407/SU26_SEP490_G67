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
        String  orderCode;
        Instant createdAt;
        String  customerName;    // null → "Khách lẻ"
        String  customerPhone;   // null → "Khách lẻ"
        BigDecimal totalAmount;
        String  orderStatus;
        String  paymentMethod;
    }
}
