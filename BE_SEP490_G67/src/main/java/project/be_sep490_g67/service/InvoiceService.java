package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.InvoiceResponse;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.UserRepository;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for generating invoice data.
 * The frontend calls GET /api/sales-orders/{id}/invoice to get JSON,
 * then renders and prints the invoice using react-to-print.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class InvoiceService {

    SalesOrderRepository salesOrderRepository;
    StoreConfigRepository storeConfigRepository;
    UserRepository userRepository;
    AuditLogService auditLogService;

    private static final DateTimeFormatter VN_FORMATTER = DateTimeFormatter
            .ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    /**
     * Get invoice data for printing.
     */
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Integer orderId, Integer currentUserId, boolean isPrivileged) {
        // 1. Fetch order
        SalesOrder order = salesOrderRepository.findActiveById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

        // 2. IDOR check
        if (!isPrivileged && !order.getCreatedBy().equals(currentUserId)) {
            log.warn("IDOR attempt: user {} tried to access order {} created by {}",
                    currentUserId, orderId, order.getCreatedBy());
            throw new AppException(ErrorCode.INVOICE_ACCESS_DENIED);
        }

        // 3. Validate order status
        if ("CANCELLED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new AppException(ErrorCode.ORDER_CANCELLED);
        }

        // 4. Validate order has details
        if (order.getSalesOrderDetails() == null || order.getSalesOrderDetails().isEmpty()) {
            throw new AppException(ErrorCode.ORDER_EMPTY_DETAILS);
        }

        // 5. Fetch store config
        StoreConfig store = storeConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new AppException(ErrorCode.STORE_CONFIG_MISSING));

        // 6. Validate order totals
        BigDecimal calculatedTotal = order.getSubtotal().subtract(order.getDiscountAmount());
        if (calculatedTotal.compareTo(order.getTotalAmount()) != 0) {
            log.error("Order {} total mismatch: subtotal {} - discount {} != total {}",
                    orderId, order.getSubtotal(), order.getDiscountAmount(), order.getTotalAmount());
            throw new AppException(ErrorCode.ORDER_TOTAL_MISMATCH);
        }

        // 7. Build invoice response
        InvoiceResponse response = new InvoiceResponse();

        // Store info
        response.setStoreName(store.getStoreName());
        response.setStoreAddress(store.getAddress());
        response.setTaxCode(store.getTaxCode());
        response.setCurrency(store.getCurrency() != null ? store.getCurrency() : "VND");
        response.setTaxRate(store.getTaxRate() != null ? store.getTaxRate() : BigDecimal.ZERO);

        // Order header
        response.setOrderId(order.getId());
        response.setOrderCode(order.getOrderCode());
        response.setOrderStatus(order.getOrderStatus());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setIsDebt(order.getIsDebt());
        response.setSubtotal(order.getSubtotal());
        response.setDiscountAmount(order.getDiscountAmount());
        response.setTotalAmount(order.getTotalAmount());
        response.setPaidAmount(order.getPaidAmount());

        // Calculate remaining debt
        BigDecimal remainingDebt = order.getIsDebt()
                ? order.getTotalAmount().subtract(order.getPaidAmount())
                : BigDecimal.ZERO;
        response.setRemainingDebt(remainingDebt);

        // Format creation time
        if (order.getCreatedAt() != null) {
            response.setCreatedAtVn(VN_FORMATTER.format(order.getCreatedAt()));
        }

        // Cashier name
        if (order.getCreatedBy() != null) {
            userRepository.findActiveById(order.getCreatedBy())
                    .ifPresent(user -> response.setCashierName(user.getFullName()));
        }

        // Customer info
        if (order.getCustomer() != null) {
            InvoiceResponse.CustomerInfo customerInfo = InvoiceResponse.CustomerInfo.builder()
                    .id(order.getCustomer().getId())
                    .fullName(order.getCustomer().getFullName())
                    .phoneNumber(order.getCustomer().getPhoneNumber())
                    .build();
            response.setCustomer(customerInfo);
        }

        // Line items
        List<InvoiceResponse.InvoiceLineItem> items = order.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .map(detail -> InvoiceResponse.InvoiceLineItem.builder()
                        .productId(detail.getProduct().getId())
                        .productName(detail.getProduct().getName())
                        .unitName(detail.getUnitName())
                        .quantity(detail.getQuantity())
                        .unitPrice(detail.getUnitPrice())
                        .discountAmount(detail.getDiscountAmount() != null ? detail.getDiscountAmount() : BigDecimal.ZERO)
                        .lineTotal(detail.getLineTotal())
                        .build())
                .collect(Collectors.toList());
        response.setItems(items);

        // 8. Log invoice access
        auditLogService.logInvoicePrint(currentUserId, orderId);

        return response;
    }
}
