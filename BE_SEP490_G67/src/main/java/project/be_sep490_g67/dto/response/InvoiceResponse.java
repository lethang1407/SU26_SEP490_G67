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
