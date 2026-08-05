package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.be_sep490_g67.dto.response.InvoiceResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.SalesOrderDetail;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.SalesOrderRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private SalesOrderRepository salesOrderRepository;

    @Mock
    private StoreConfigRepository storeConfigRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private InvoiceService invoiceService;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private SalesOrder buildOrder(Integer id, Integer createdBy, String status, Boolean isDebt,
            BigDecimal subtotal, BigDecimal discount, BigDecimal total, BigDecimal paid) {
        SalesOrder order = new SalesOrder();
        order.setId(id);
        order.setOrderCode("SO-" + id);
        order.setCreatedBy(createdBy);
        order.setOrderStatus(status);
        order.setIsDebt(isDebt);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discount);
        order.setTotalAmount(total);
        order.setPaidAmount(paid);
        order.setCreatedAt(Instant.now());
        return order;
    }

    private SalesOrderDetail buildDetail(Product product, BigDecimal quantity, BigDecimal price, BigDecimal lineTotal) {
        SalesOrderDetail detail = new SalesOrderDetail();
        detail.setProduct(product);
        detail.setQuantity(quantity.intValue());
        detail.setUnitPrice(price);
        detail.setLineTotal(lineTotal);
        detail.setUnitName("Cai");
        return detail;
    }

    private StoreConfig buildStoreConfig() {
        StoreConfig store = new StoreConfig();
        store.setStoreName("Test Store");
        store.setAddress("123 Street");
        store.setTaxCode("123456789");
        store.setCurrency("VND");
        store.setTaxRate(BigDecimal.ZERO);
        return store;
    }

    // =========================================================================
    // TEST CASES FOR getInvoice
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. getInvoice - Order Not Found
    // Condition: Order ID does not exist in repository
    // Confirm: Throws AppException with ErrorCode.ORDER_NOT_FOUND
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw ORDER_NOT_FOUND when order does not exist")
    void getInvoice_orderNotFound_throwsException() {
        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, true))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ORDER_NOT_FOUND);

        verifyNoInteractions(storeConfigRepository, auditLogService);
    }

    // -------------------------------------------------------------------------
    // 2. getInvoice - IDOR Blocked (Not privileged and wrong user)
    // Condition: User is not privileged and currentUserId != order.createdBy
    // Confirm: Throws AppException with ErrorCode.INVOICE_ACCESS_DENIED, logs
    // warning
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw INVOICE_ACCESS_DENIED when IDOR is detected")
    void getInvoice_idorBlocked_throwsException() {
        SalesOrder order = buildOrder(1, 200, "COMPLETED", false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO);
        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, false))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVOICE_ACCESS_DENIED);
    }

    // -------------------------------------------------------------------------
    // 3. getInvoice - Order Cancelled
    // Condition: Order status is CANCELLED
    // Confirm: Throws AppException with ErrorCode.ORDER_CANCELLED
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw ORDER_CANCELLED when order is cancelled")
    void getInvoice_orderCancelled_throwsException() {
        SalesOrder order = buildOrder(1, 100, "CANCELLED", false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO);
        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, false))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ORDER_CANCELLED);
    }

    // -------------------------------------------------------------------------
    // 4. getInvoice - Order Empty Details
    // Condition: Order has no SalesOrderDetails
    // Confirm: Throws AppException with ErrorCode.ORDER_EMPTY_DETAILS
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw ORDER_EMPTY_DETAILS when order has no details")
    void getInvoice_emptyDetails_throwsException() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO);
        order.setSalesOrderDetails(Set.of());
        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, false))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ORDER_EMPTY_DETAILS);
    }

    // -------------------------------------------------------------------------
    // 5. getInvoice - Store Config Missing
    // Condition: StoreConfigRepository returns empty
    // Confirm: Throws AppException with ErrorCode.STORE_CONFIG_MISSING
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw STORE_CONFIG_MISSING when store config not found")
    void getInvoice_storeConfigMissing_throwsException() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.TEN,
                BigDecimal.TEN);
        Product p = new Product();
        p.setId(1);
        p.setName("Test Product");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN);
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, false))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.STORE_CONFIG_MISSING);
    }

    // -------------------------------------------------------------------------
    // 6. getInvoice - Total Mismatch
    // Condition: Subtotal - discount != totalAmount
    // Confirm: Throws AppException with ErrorCode.ORDER_TOTAL_MISMATCH, logs error
    // Result: Type A, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw ORDER_TOTAL_MISMATCH when amounts do not match")
    void getInvoice_totalMismatch_throwsException() {
        // subtotal 10, discount 0, total 20 (mismatch)
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, BigDecimal.TEN, BigDecimal.ZERO,
                new BigDecimal("20.00"), BigDecimal.TEN);
        Product p = new Product();
        p.setId(1);
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN);
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));

        assertThatThrownBy(() -> invoiceService.getInvoice(1, 100, false))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ORDER_TOTAL_MISMATCH);
    }

    // -------------------------------------------------------------------------
    // 7. getInvoice - Success (Not Debt)
    // Condition: All validations pass, isDebt = false
    // Confirm: Returns InvoiceResponse with remainingDebt = 0, auditLogService
    // called
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should return valid invoice with 0 remaining debt for non-debt orders")
    void getInvoice_successNotDebt_returnsInvoice() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), new BigDecimal("10"),
                new BigDecimal("90"), new BigDecimal("90"));

        Customer customer = new Customer();
        customer.setId(5);
        customer.setFullName("Test Customer");
        customer.setPhoneNumber("0123456789");
        order.setCustomer(customer);

        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        User cashier = new User();
        cashier.setFullName("Cashier Name");

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));
        when(userRepository.findActiveById(100)).thenReturn(Optional.of(cashier));

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response).isNotNull();
        assertThat(response.getRemainingDebt()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getCashierName()).isEqualTo("Cashier Name");
        assertThat(response.getCustomer().getFullName()).isEqualTo("Test Customer");

        verify(auditLogService, times(1)).logInvoicePrint(100, 1);
    }

    // -------------------------------------------------------------------------
    // 8. getInvoice - Success (Is Debt)
    // Condition: All validations pass, isDebt = true
    // Confirm: Returns InvoiceResponse, calculates remainingDebt accurately
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should calculate remaining debt correctly for debt orders")
    void getInvoice_successIsDebt_calculatesDebt() {
        // total 100, paid 40 -> remaining 60
        SalesOrder order = buildOrder(2, 100, "COMPLETED", true, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("40"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(2)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));

        InvoiceResponse response = invoiceService.getInvoice(2, 200, true);

        assertThat(response).isNotNull();
        assertThat(response.getRemainingDebt()).isEqualByComparingTo(new BigDecimal("60"));

        verify(auditLogService, times(1)).logInvoicePrint(200, 2);
    }

    // -------------------------------------------------------------------------
    // 9. getInvoice - Privileged User Bypasses IDOR Check
    // Condition: isPrivileged = true and currentUserId != order.createdBy
    // Confirm: No exception thrown, invoice is returned
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should allow privileged user to access another user's order")
    void getInvoice_privilegedUser_bypassesIdorCheck() {
        SalesOrder order = buildOrder(1, 999, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));
        when(userRepository.findActiveById(999)).thenReturn(Optional.empty());

        InvoiceResponse response = invoiceService.getInvoice(1, 100, true);

        assertThat(response).isNotNull();
        verify(auditLogService, times(1)).logInvoicePrint(100, 1);
    }

    // -------------------------------------------------------------------------
    // 10. getInvoice - Filters Out Removed Line Items
    // Condition: One detail has isRemoved = true
    // Confirm: Returned items list excludes the removed detail
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should exclude removed line items from invoice")
    void getInvoice_filtersRemovedLineItems() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));

        Product p1 = new Product();
        p1.setId(1);
        p1.setName("Kept Product");
        SalesOrderDetail keptDetail = buildDetail(p1, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));

        Product p2 = new Product();
        p2.setId(2);
        p2.setName("Removed Product");
        SalesOrderDetail removedDetail = buildDetail(p2, BigDecimal.ONE, new BigDecimal("50"), new BigDecimal("50"));
        removedDetail.setIsRemoved(true);

        order.setSalesOrderDetails(Set.of(keptDetail, removedDetail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getProductName()).isEqualTo("Kept Product");
    }

    // -------------------------------------------------------------------------
    // 11. getInvoice - Defaults Currency and Tax Rate When Missing
    // Condition: StoreConfig.currency = null, StoreConfig.taxRate = null
    // Confirm: Response defaults currency to "VND" and taxRate to ZERO
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should default currency to VND and tax rate to zero when store config values are null")
    void getInvoice_storeConfigMissingCurrencyAndTaxRate_appliesDefaults() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        StoreConfig store = buildStoreConfig();
        store.setCurrency(null);
        store.setTaxRate(null);

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(store));

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getCurrency()).isEqualTo("VND");
        assertThat(response.getTaxRate()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // -------------------------------------------------------------------------
    // 12. getInvoice - No Customer (Walk-in Sale)
    // Condition: order.getCustomer() is null
    // Confirm: response.getCustomer() stays null, no exception
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should leave customer null for walk-in orders")
    void getInvoice_noCustomer_returnsNullCustomer() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getCustomer()).isNull();
    }

    // -------------------------------------------------------------------------
    // 13. getInvoice - Cashier Not Found
    // Condition: userRepository.findActiveById(createdBy) returns empty
    // Confirm: response.getCashierName() stays null, no exception
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should leave cashier name null when cashier user cannot be found")
    void getInvoice_cashierNotFound_leavesCashierNameNull() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));
        when(userRepository.findActiveById(100)).thenReturn(Optional.empty());

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getCashierName()).isNull();
    }

    // -------------------------------------------------------------------------
    // 14. getInvoice - Null CreatedAt
    // Condition: order.getCreatedAt() is null
    // Confirm: response.getCreatedAtVn() stays null, no exception thrown
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should leave createdAtVn null when order createdAt is null")
    void getInvoice_nullCreatedAt_leavesCreatedAtVnNull() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        order.setCreatedAt(null);
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));
        when(userRepository.findActiveById(100)).thenReturn(Optional.empty());

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getCreatedAtVn()).isNull();
    }

    // -------------------------------------------------------------------------
    // 15. getInvoice - Null Line Item Discount Defaults to Zero
    // Condition: SalesOrderDetail.discountAmount is null
    // Confirm: InvoiceLineItem.discountAmount defaults to BigDecimal.ZERO
    // Result: Type N, passed
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should default line item discount to zero when null")
    void getInvoice_lineItemDiscountNull_defaultsToZero() {
        SalesOrder order = buildOrder(1, 100, "COMPLETED", false, new BigDecimal("100"), BigDecimal.ZERO,
                new BigDecimal("100"), new BigDecimal("100"));
        Product p = new Product();
        p.setId(1);
        p.setName("Product A");
        SalesOrderDetail detail = buildDetail(p, BigDecimal.ONE, new BigDecimal("100"), new BigDecimal("100"));
        detail.setDiscountAmount(null);
        order.setSalesOrderDetails(Set.of(detail));

        when(salesOrderRepository.findActiveById(1)).thenReturn(Optional.of(order));
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(buildStoreConfig()));
        when(userRepository.findActiveById(100)).thenReturn(Optional.empty());

        InvoiceResponse response = invoiceService.getInvoice(1, 100, false);

        assertThat(response.getItems().get(0).getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

}
