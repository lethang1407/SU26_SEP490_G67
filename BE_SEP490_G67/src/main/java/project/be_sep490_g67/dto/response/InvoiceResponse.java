package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

/**
 * Full payload returned by GET /api/sales-orders/{id}/invoice.
 * Backend returns JSON; the React frontend renders and prints this via react-to-print.
 * No PDF is generated on the server side.
 */
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
    /** "COMPLETED" | "CANCELLED" — FE should display a CANCELLED watermark when this value is CANCELLED */
    String orderStatus;
    String paymentMethod;
    /** true = sold on credit (BR-39); invoice must clearly show "BÁN NỢ" */
    Boolean isDebt;
    BigDecimal subtotal;
    BigDecimal discountAmount;
    BigDecimal totalAmount;
    BigDecimal paidAmount;
    /** Only meaningful when isDebt=true: totalAmount - paidAmount */
    BigDecimal remainingDebt;
    /** Created-at timestamp formatted as dd/MM/yyyy HH:mm in Vietnam timezone (UTC+7) */
    String createdAtVn;

    // ---- Cashier ----
    String cashierName;

    // ---- Customer (null for walk-in / anonymous) ----
    CustomerInfo customer;

    // ---- Line items ----
    List<InvoiceLineItem> items;

    // ---- Nested types ----

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
        /** Snapshot written at time of sale (UC-40/41) — never recalculated */
        String unitName;
        Integer quantity;
        BigDecimal unitPrice;
        BigDecimal discountAmount;
        BigDecimal lineTotal;
    }
}
