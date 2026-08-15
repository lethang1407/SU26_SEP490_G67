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
public class InvoiceResponse {

    // ---- Store info ----
    String storeName;
    String storeAddress;
    String taxCode;
    String currency;
    BigDecimal taxRate;

    // ---- Order header ----
    Integer orderId;
    String orderCode;
    String orderStatus;
    String paymentMethod;
    Boolean isDebt;
    BigDecimal subtotal;
    BigDecimal discountAmount;
    BigDecimal totalAmount;
    BigDecimal paidAmount;
    BigDecimal remainingDebt;
    Instant dueDate;
    Boolean isCheckDebtUnstable;
    String createdAtVn;

    String cashierName;

    CustomerInfo customer;

    List<InvoiceLineItem> items;

    /** Mã hóa đơn gốc, chỉ có giá trị khi đây là một đơn đổi. */
    String originalOrderCode;

    /**
     * Phiếu trả và đơn đổi phát sinh từ hóa đơn này, kèm dòng hàng của từng chứng từ
     */
    List<RelatedDocument> relatedDocuments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedDocument {
        Integer id;
        String code;
        /** RETURN = phiếu trả hàng, EXCHANGE = hóa đơn hàng lấy mới. */
        String type;
        String createdAtVn;
        /** Tiền hàng trả về (RETURN) hoặc tiền hàng lấy mới (EXCHANGE). */
        BigDecimal amount;
        List<InvoiceLineItem> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        Integer id;
        String fullName;
        String phoneNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceLineItem {
        Integer productId;
        String productName;
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal discountAmount;
        BigDecimal lineTotal;
    }
}
