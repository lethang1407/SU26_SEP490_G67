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
public class ReturnLookupResponse {
    List<OrderMatch> orders;
    long totalElements;
    SearchScope scope;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class SearchScope {
        String productName;
        String barcode;
        String customerPhone;
        String storeName;
        Instant from;
        Instant to;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderMatch {
        Integer orderId;
        String orderCode;
        Instant createdAt;
        String cashierName;
        String customerName;
        String customerPhone;
        BigDecimal totalAmount;
        String orderStatus;
        Boolean partiallyReturned;
        MatchedLine matchedLine;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class MatchedLine {
        Integer salesOrderDetailId;
        Integer productId;
        String productName;
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        Integer quantityReturnable;
    }
}
