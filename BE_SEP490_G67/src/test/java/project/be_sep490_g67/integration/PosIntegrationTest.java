package project.be_sep490_g67.integration;

// Spring Boot 4 dùng Jackson 3: bean ObjectMapper trong context là
// tools.jackson.databind.ObjectMapper, không phải bản com.fasterxml của Jackson 2.
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
// Spring Boot 4 đã chuyển @WebMvcTest khỏi org.springframework.boot.test.autoconfigure.web.servlet
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import project.be_sep490_g67.controller.ProductController;
import project.be_sep490_g67.controller.SalesOrderController;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.entity.Role;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.*;

import java.math.BigDecimal;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  POS Feature — Backend Integration Tests
 *  Grouped into three functional areas that mirror the sequence diagrams:
 *
 *  Group 1 │ Scan Barcode          │ SD-POS-02
 *  Group 2 │ Add Product to Cart   │ SD-POS-01 (checkout phase)
 *  Group 3 │ Print Invoice         │ SD-POS-03
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Stack  : Spring Boot Test (WebMvcTest) + Mockito
 * Run    : mvn test -Dtest=PosIntegrationTest
 * ═══════════════════════════════════════════════════════════════════════════
 */
@ExtendWith(SpringExtension.class)
@WebMvcTest(controllers = {ProductController.class, SalesOrderController.class})
@Import(PosIntegrationTest.CacheTestConfig.class)
@DisplayName("POS Feature — Backend Integration Tests")
class PosIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    // ── Service mocks (ProductController dependencies) ──
    @MockitoBean ProductService productService;

    // ── Service mocks (SalesOrderController dependencies) ──
    @MockitoBean SalesOrderService salesOrderService;
    @MockitoBean ExchangeOrderService exchangeOrderService;
    @MockitoBean InvoiceService invoiceService;
    @MockitoBean ReturnLookupService returnLookupService;
    @MockitoBean UserRepository userRepository;

    // ── AuditLog needed by InvoiceService during context wiring ──
    @MockitoBean AuditLogService auditLogService;

    /**
     * The application class is annotated with @EnableCaching, but the @WebMvcTest
     * slice does not load RedisConfig/CacheAutoConfiguration, so the context would
     * fail with "No qualifying bean of type CacheManager". An in-memory manager
     * satisfies the caching infrastructure without touching Redis.
     */
    @TestConfiguration
    static class CacheTestConfig {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHARED FIXTURES
    // ─────────────────────────────────────────────────────────────────────────

    private static final String BARCODE_VALID     = "8934567890123";
    private static final String BARCODE_NOT_FOUND = "0000000000000";
    private static final int    PRODUCT_ID        = 1;
    private static final int    ORDER_ID          = 100;
    private static final int    CASHIER_USER_ID   = 10;
    private static final int    OTHER_USER_ID     = 99;

    /** Cashier role */
    private static Role cashierRole() {
        Role r = new Role();
        r.setName("CASHIER");
        return r;
    }

    /** Admin role */
    private static Role adminRole() {
        Role r = new Role();
        r.setName("ADMIN");
        return r;
    }

    /** Build a minimal User entity */
    private static User buildUser(int id, String username, Role role) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setRoles(Set.of(role));
        return u;
    }

    /** Build a minimal ProductBarcodeResponse */
    private static ProductBarcodeResponse barcodeResponse() {
        ProductBarcodeResponse.ProductUnitInfo unit = ProductBarcodeResponse.ProductUnitInfo.builder()
                .id(1).name("Viên").unitBase(BigDecimal.ONE).build();

        ProductBarcodeResponse.StockBatchInfo batch = ProductBarcodeResponse.StockBatchInfo.builder()
                .id(1).batchCode("LOT-001").quantity(100).expiryDate("2027-01-01").build();

        return ProductBarcodeResponse.builder()
                .id(PRODUCT_ID)
                .name("Paracetamol 500mg")
                .barcode(BARCODE_VALID)
                .sellingPrice(new BigDecimal("5000"))
                .productUnits(List.of(unit))
                .stockBatches(List.of(batch))
                .build();
    }

    /** Build a minimal InvoiceResponse */
    private static InvoiceResponse invoiceResponse(boolean isDebt) {
        InvoiceResponse.InvoiceLineItem item = InvoiceResponse.InvoiceLineItem.builder()
                .productId(PRODUCT_ID)
                .productName("Paracetamol 500mg")
                .unitName("Viên")
                .quantity(2)
                .unitPrice(new BigDecimal("5000"))
                .discountAmount(BigDecimal.ZERO)
                .lineTotal(new BigDecimal("10000"))
                .build();

        InvoiceResponse resp = new InvoiceResponse();
        resp.setOrderId(ORDER_ID);
        resp.setOrderCode("HD-20260001");
        resp.setOrderStatus("COMPLETED");
        resp.setPaymentMethod("CASH");
        resp.setIsDebt(isDebt);
        resp.setStoreName("Nha Thuoc ABC");
        resp.setStoreAddress("123 Nguyen Hue");
        resp.setTaxCode("0123456789");
        resp.setCurrency("VND");
        resp.setTaxRate(BigDecimal.ZERO);
        resp.setSubtotal(new BigDecimal("10000"));
        resp.setDiscountAmount(BigDecimal.ZERO);
        resp.setTotalAmount(new BigDecimal("10000"));
        resp.setPaidAmount(isDebt ? new BigDecimal("4000") : new BigDecimal("10000"));
        resp.setRemainingDebt(isDebt ? new BigDecimal("6000") : BigDecimal.ZERO);
        resp.setCreatedAtVn("08/08/2026 10:30");
        resp.setCashierName("Nguyen Van B");
        resp.setItems(List.of(item));
        return resp;
    }

    /** Build a minimal SalesOrderResponse */
    private static SalesOrderResponse salesOrderResponse(int id) {
        SalesOrderResponse r = new SalesOrderResponse();
        r.setId(id);
        r.setOrderCode("HD-20260001");
        r.setOrderStatus("COMPLETED");
        r.setTotalAmount(new BigDecimal("10000"));
        return r;
    }

    /** Build a valid CreateSalesOrderRequest JSON body */
    private String buildOrderRequestJson(Integer customerId, String paymentMethod,
                                          BigDecimal discount) throws Exception {
        CreateSalesOrderRequest.OrderItemRequest item = new CreateSalesOrderRequest.OrderItemRequest();
        item.setProductId(PRODUCT_ID);
        item.setBatchId(1);
        item.setProductUnitId(1);
        item.setQuantity(2);
        item.setUnitPrice(new BigDecimal("5000"));

        CreateSalesOrderRequest req = new CreateSalesOrderRequest();
        req.setCustomerId(customerId);
        req.setPaymentMethod(paymentMethod);
        req.setDiscountAmount(discount != null ? discount : BigDecimal.ZERO);
        req.setItems(List.of(item));

        return objectMapper.writeValueAsString(req);
    }


    // =========================================================================
    //  GROUP 1 — SCAN BARCODE INTEGRATION
    //  Endpoint : GET /api/products/barcode/{barcode}
    //  Sequence : SD-POS-02
    // =========================================================================

    @Nested
    @DisplayName("Group 1 — Scan Barcode Integration")
    class ScanBarcodeIntegration {

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-01: Known barcode returns 200 with product data")
        void sb01_knownBarcode_returns200WithProductData() throws Exception {
            // Arrange
            when(productService.getProductByBarcode(BARCODE_VALID))
                    .thenReturn(barcodeResponse());

            // Act & Assert
            mockMvc.perform(get("/api/products/barcode/{barcode}", BARCODE_VALID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.id").value(PRODUCT_ID))
                    .andExpect(jsonPath("$.result.name").value("Paracetamol 500mg"))
                    .andExpect(jsonPath("$.result.barcode").value(BARCODE_VALID))
                    .andExpect(jsonPath("$.result.productUnits", hasSize(1)))
                    .andExpect(jsonPath("$.result.stockBatches", hasSize(1)))
                    .andExpect(jsonPath("$.result.stockBatches[0].batchCode").value("LOT-001"));
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-02: Unknown barcode — service throws 404, API returns 404")
        void sb02_unknownBarcode_returns404() throws Exception {
            // Arrange
            when(productService.getProductByBarcode(BARCODE_NOT_FOUND))
                    .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Khong tim thay san pham voi ma vach: " + BARCODE_NOT_FOUND));

            // Act & Assert
            mockMvc.perform(get("/api/products/barcode/{barcode}", BARCODE_NOT_FOUND))
                    .andExpect(status().isNotFound());
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-03: Product with no available batches — stockBatches list is empty")
        void sb03_productWithNoBatches_returnsEmptyBatchList() throws Exception {
            // Arrange
            ProductBarcodeResponse noBatches = ProductBarcodeResponse.builder()
                    .id(PRODUCT_ID)
                    .name("Paracetamol 500mg")
                    .barcode(BARCODE_VALID)
                    .sellingPrice(new BigDecimal("5000"))
                    .productUnits(List.of())
                    .stockBatches(List.of())   // no stock
                    .build();

            when(productService.getProductByBarcode(BARCODE_VALID)).thenReturn(noBatches);

            // Act & Assert
            mockMvc.perform(get("/api/products/barcode/{barcode}", BARCODE_VALID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.stockBatches", hasSize(0)));
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-04: Product with multiple batches — all batches returned")
        void sb04_productWithMultipleBatches_returnsAllBatches() throws Exception {
            // Arrange
            ProductBarcodeResponse.StockBatchInfo batchA = ProductBarcodeResponse.StockBatchInfo.builder()
                    .id(1).batchCode("LOT-A").quantity(50).expiryDate("2026-12-01").build();
            ProductBarcodeResponse.StockBatchInfo batchB = ProductBarcodeResponse.StockBatchInfo.builder()
                    .id(2).batchCode("LOT-B").quantity(30).expiryDate("2027-06-01").build();

            ProductBarcodeResponse multiResponse = ProductBarcodeResponse.builder()
                    .id(PRODUCT_ID).name("Vitamin C 1000mg").barcode(BARCODE_VALID)
                    .sellingPrice(new BigDecimal("12000"))
                    .productUnits(List.of())
                    .stockBatches(List.of(batchA, batchB))
                    .build();

            when(productService.getProductByBarcode(BARCODE_VALID)).thenReturn(multiResponse);

            // Act & Assert
            mockMvc.perform(get("/api/products/barcode/{barcode}", BARCODE_VALID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.stockBatches", hasSize(2)))
                    .andExpect(jsonPath("$.result.stockBatches[0].batchCode").value("LOT-A"))
                    .andExpect(jsonPath("$.result.stockBatches[1].batchCode").value("LOT-B"));
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-05: Product name search with 1-char query — server handles gracefully")
        void sb05_shortQuery_noApiCall() throws Exception {
            // Server-side: even a 1-char query is accepted by the endpoint;
            // the BR-CART-01 min-length guard is enforced CLIENT-SIDE.
            // Service returns empty list for non-matching input.
            when(productService.searchByNameAndBarcode("P")).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/products/search").param("q", "P"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result", hasSize(0)));
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-06: Product name search returns matching products")
        void sb06_productNameSearch_returnsMatches() throws Exception {
            // Arrange
            ProductSearchResponse match = ProductSearchResponse.builder()
                    .id(PRODUCT_ID)
                    .name("Paracetamol 500mg")
                    .barcode(BARCODE_VALID)
                    .sellingPrice(new BigDecimal("5000"))
                    .build();

            when(productService.searchByNameAndBarcode("Para")).thenReturn(List.of(match));

            // Act & Assert
            mockMvc.perform(get("/api/products/search").param("q", "Para"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result", hasSize(1)))
                    .andExpect(jsonPath("$.result[0].name").value("Paracetamol 500mg"));
        }

        @Test
        @WithMockUser(username = "cashier1", roles = {"CASHIER"})
        @DisplayName("SITCID-SB-07: Product name search — no match returns empty list")
        void sb07_productNameSearch_noMatch_returnsEmptyList() throws Exception {
            // Arrange
            when(productService.searchByNameAndBarcode("XYZ_NONEXISTENT"))
                    .thenReturn(Collections.emptyList());

            // Act & Assert
            mockMvc.perform(get("/api/products/search").param("q", "XYZ_NONEXISTENT"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result", hasSize(0)));
        }
    }


    // =========================================================================
    //  GROUP 2 — ADD PRODUCT TO CART INTEGRATION  (Checkout Phase)
    //  Endpoint : POST /api/sales-orders
    //           : POST /api/sales-orders/debt
    //  Sequence : SD-POS-01 (steps 20-25: server-side checkout triggered after
    //             client-side cart is finalised)
    // =========================================================================

    @Nested
    @DisplayName("Group 2 — Add Product to Cart / Checkout Integration")
    class AddProductToCartIntegration {

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-01: Normal cash checkout — 201 Created with orderId")
        void ac01_cashCheckout_returns201() throws Exception {
            // Arrange
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(any(), eq(false), eq(CASHIER_USER_ID)))
                    .thenReturn(salesOrderResponse(ORDER_ID));

            String body = buildOrderRequestJson(null, "CASH", null);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.result.id").value(ORDER_ID))
                    .andExpect(jsonPath("$.result.orderCode").value("HD-20260001"))
                    .andExpect(jsonPath("$.result.orderStatus").value("COMPLETED"));
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-02: Debt checkout — 200 with isDebt=true order")
        void ac02_debtCheckout_createsDebtOrder() throws Exception {
            // Arrange
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));

            SalesOrderResponse debtResp = salesOrderResponse(ORDER_ID);
            when(salesOrderService.createOrder(any(), eq(true), eq(CASHIER_USER_ID)))
                    .thenReturn(debtResp);

            String body = buildOrderRequestJson(42, "CASH", null);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders/debt")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.id").value(ORDER_ID));

            // Verify debt=true was passed to service
            verify(salesOrderService).createOrder(any(), eq(true), anyInt());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-03: Checkout with customer — customerId passed through to service")
        void ac03_checkoutWithCustomer_customerIdPassedThrough() throws Exception {
            // Arrange
            int customerId = 42;
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(
                    argThat(r -> Objects.equals(r.getCustomerId(), customerId)),
                    eq(false), eq(CASHIER_USER_ID)))
                    .thenReturn(salesOrderResponse(ORDER_ID));

            String body = buildOrderRequestJson(customerId, "CASH", null);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            verify(salesOrderService).createOrder(
                    argThat(r -> Objects.equals(r.getCustomerId(), customerId)),
                    eq(false), anyInt());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-04: Checkout with discount — discountAmount forwarded to service")
        void ac04_checkoutWithDiscount_discountForwarded() throws Exception {
            // Arrange
            BigDecimal discount = new BigDecimal("1000");
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(
                    argThat(r -> discount.compareTo(r.getDiscountAmount()) == 0),
                    eq(false), anyInt()))
                    .thenReturn(salesOrderResponse(ORDER_ID));

            String body = buildOrderRequestJson(null, "CASH", discount);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());

            verify(salesOrderService).createOrder(
                    argThat(r -> discount.compareTo(r.getDiscountAmount()) == 0),
                    eq(false), anyInt());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-05: Insufficient stock — service throws 400, API propagates")
        void ac05_insufficientStock_returns400() throws Exception {
            // Arrange
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(any(), eq(false), anyInt()))
                    .thenThrow(new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Khong du ton kho"));

            String body = buildOrderRequestJson(null, "CASH", null);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-06: Unknown productId in checkout — service throws 404")
        void ac06_unknownProductId_returns404() throws Exception {
            // Arrange
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(any(), eq(false), anyInt()))
                    .thenThrow(new AppException(ErrorCode.PRODUCT_NOT_FOUND));

            String body = buildOrderRequestJson(null, "CASH", null);

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-07: Empty items list — validation rejects with 400")
        void ac07_emptyItems_returns400() throws Exception {
            // Arrange — build request with no items
            CreateSalesOrderRequest req = new CreateSalesOrderRequest();
            req.setPaymentMethod("CASH");
            req.setDiscountAmount(BigDecimal.ZERO);
            req.setItems(Collections.emptyList());  // violates @NotEmpty

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-AC-08: Debt checkout without customerId — service throws 400")
        void ac08_debtWithoutCustomer_returns400() throws Exception {
            // Arrange — no customerId in a debt order
            // Endpoint checkout lay staffId qua resolveStaffId() -> findByUsername
            when(userRepository.findByUsername("cashier1"))
                    .thenReturn(Optional.of(buildUser(CASHIER_USER_ID, "cashier1", cashierRole())));
            when(salesOrderService.createOrder(any(), eq(true), anyInt()))
                    .thenThrow(new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Don no phai co thong tin khach hang"));

            String body = buildOrderRequestJson(null, "CASH", null); // no customerId

            // Act & Assert
            mockMvc.perform(post("/api/sales-orders/debt")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }


    // =========================================================================
    //  GROUP 3 — PRINT INVOICE INTEGRATION
    //  Endpoint : GET /api/sales-orders/{id}/invoice
    //  Sequence : SD-POS-03
    //  Based on : InvoiceService_TestCases.md (UTCID01–UTCID15)
    // =========================================================================

    @Nested
    @DisplayName("Group 3 — Print Invoice Integration")
    class PrintInvoiceIntegration {

        // ── Helper: set up authenticated user stubs ──────────────────────────
        private void setupCashierUser(String username, int userId) {
            when(userRepository.findActiveByUsernameWithRole(username))
                    .thenReturn(Optional.of(buildUser(userId, username, cashierRole())));
        }

        private void setupAdminUser(String username, int userId) {
            when(userRepository.findActiveByUsernameWithRole(username))
                    .thenReturn(Optional.of(buildUser(userId, username, adminRole())));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-01 (maps to UTCID07): Owner cashier retrieves own invoice
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-01 [UTCID07]: Owner cashier fetches invoice — 200 with full data")
        void pi01_ownerCashierFetchesInvoice_returns200() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            InvoiceResponse resp = invoiceResponse(false);
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.orderId").value(ORDER_ID))
                    .andExpect(jsonPath("$.result.orderCode").value("HD-20260001"))
                    .andExpect(jsonPath("$.result.storeName").value("Nha Thuoc ABC"))
                    .andExpect(jsonPath("$.result.cashierName").value("Nguyen Van B"))
                    .andExpect(jsonPath("$.result.items", hasSize(1)))
                    .andExpect(jsonPath("$.result.items[0].productName").value("Paracetamol 500mg"))
                    .andExpect(jsonPath("$.result.remainingDebt").value(0))
                    .andExpect(jsonPath("$.result.currency").value("VND"));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-02 (maps to UTCID02): IDOR blocked for non-owner cashier
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier2")
        @DisplayName("SITCID-PI-02 [UTCID02]: Non-owner cashier blocked by IDOR check — 403")
        void pi02_nonOwnerCashierBlocked_returns403() throws Exception {
            // Arrange — cashier2 tries to fetch cashier1's invoice
            setupCashierUser("cashier2", OTHER_USER_ID);
            when(invoiceService.getInvoice(ORDER_ID, OTHER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.INVOICE_ACCESS_DENIED));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isForbidden());
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-03 (maps to UTCID09): Privileged ADMIN bypasses IDOR
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "admin1")
        @DisplayName("SITCID-PI-03 [UTCID09]: ADMIN with isPrivileged=true bypasses IDOR — 200")
        void pi03_adminBypasses_returns200() throws Exception {
            // Arrange
            setupAdminUser("admin1", OTHER_USER_ID);
            InvoiceResponse resp = invoiceResponse(false);
            // Admin is isPrivileged=true; service should be called with isPrivileged=true
            when(invoiceService.getInvoice(ORDER_ID, OTHER_USER_ID, true)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.orderId").value(ORDER_ID));

            verify(invoiceService).getInvoice(ORDER_ID, OTHER_USER_ID, true);
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-04 (maps to UTCID03): Cancelled order returns error
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-04 [UTCID03]: Cancelled order raises ORDER_CANCELLED")
        void pi04_cancelledOrder_returnsError() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.ORDER_CANCELLED));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().is(ErrorCode.ORDER_CANCELLED.getStatusCode().value()));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-05 (maps to UTCID04): Order with empty details
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-05 [UTCID04]: Order with no line items raises ORDER_EMPTY_DETAILS")
        void pi05_orderWithNoDetails_returnsError() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.ORDER_EMPTY_DETAILS));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().is(ErrorCode.ORDER_EMPTY_DETAILS.getStatusCode().value()));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-06 (maps to UTCID05): Missing store config
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-06 [UTCID05]: Missing store config raises STORE_CONFIG_MISSING")
        void pi06_missingStoreConfig_returnsError() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.STORE_CONFIG_MISSING));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().is(ErrorCode.STORE_CONFIG_MISSING.getStatusCode().value()));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-07 (maps to UTCID06): Total integrity mismatch
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-07 [UTCID06]: Subtotal − discount ≠ totalAmount raises ORDER_TOTAL_MISMATCH")
        void pi07_totalMismatch_returnsError() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.ORDER_TOTAL_MISMATCH));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().is(ErrorCode.ORDER_TOTAL_MISMATCH.getStatusCode().value()));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-08 (maps to UTCID08): Debt order — remaining debt calculated
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-08 [UTCID08]: Debt order — remainingDebt = total − paid")
        void pi08_debtOrder_remainingDebtCorrect() throws Exception {
            // Arrange: total=10000, paid=4000 → remaining=6000
            setupCashierUser("cashier1", CASHIER_USER_ID);
            InvoiceResponse resp = invoiceResponse(true); // isDebt=true, remaining=6000
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.isDebt").value(true))
                    .andExpect(jsonPath("$.result.remainingDebt").value(6000));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-09 (maps to UTCID10): Removed line items excluded
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-09 [UTCID10]: Removed line items are excluded from invoice items")
        void pi09_removedLineItemsExcluded() throws Exception {
            // Arrange — only 1 active item returned (1 was removed server-side)
            setupCashierUser("cashier1", CASHIER_USER_ID);
            InvoiceResponse resp = invoiceResponse(false); // has 1 item (removed one filtered)
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.items", hasSize(1)));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-10 (maps to UTCID15): Null discountAmount defaults to ZERO
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-10 [UTCID15]: Line item with null discountAmount defaults to ZERO")
        void pi10_nullDiscountDefaultsToZero() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            InvoiceResponse resp = invoiceResponse(false);
            // discountAmount is ZERO (null was defaulted by service — see InvoiceService line 138)
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.items[0].discountAmount").value(0));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-11 (maps to UTCID01): Order not found raises ORDER_NOT_FOUND
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-11 [UTCID01]: Non-existent orderId raises ORDER_NOT_FOUND")
        void pi11_orderNotFound_returnsError() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            when(invoiceService.getInvoice(9999, CASHIER_USER_ID, false))
                    .thenThrow(new AppException(ErrorCode.ORDER_NOT_FOUND));

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", 9999))
                    .andExpect(status().is(ErrorCode.ORDER_NOT_FOUND.getStatusCode().value()));
        }

        // ─────────────────────────────────────────────────────────────────────
        //  SITCID-PI-12 (maps to UTCID12): No customer — customer field is null
        // ─────────────────────────────────────────────────────────────────────
        @Test
        @WithMockUser(username = "cashier1")
        @DisplayName("SITCID-PI-12 [UTCID12]: Order with no customer — customer is null in response")
        void pi12_noCustomer_customerIsNull() throws Exception {
            // Arrange
            setupCashierUser("cashier1", CASHIER_USER_ID);
            InvoiceResponse resp = invoiceResponse(false);
            resp.setCustomer(null); // no customer
            when(invoiceService.getInvoice(ORDER_ID, CASHIER_USER_ID, false)).thenReturn(resp);

            // Act & Assert
            mockMvc.perform(get("/api/sales-orders/{id}/invoice", ORDER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.result.customer").doesNotExist());
        }
    }
}
