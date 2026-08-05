package project.be_sep490_g67.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.GlobalExceptionHandler;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.ExchangeOrderService;
import project.be_sep490_g67.service.InvoiceService;
import project.be_sep490_g67.service.SalesOrderService;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Endpoint tests for POST /api/sales-orders (and its /debt variant).
 *
 * Uses a standalone MockMvc so the request goes through real JSON binding,
 * bean validation and GlobalExceptionHandler without needing MySQL/Redis.
 */
@ExtendWith(MockitoExtension.class)
class SalesOrderControllerTest {

    private static final String PATH = "/api/sales-orders";
    private static final Integer STAFF_ID = 100;

    @Mock
    private SalesOrderService salesOrderService;

    @Mock
    private ExchangeOrderService exchangeOrderService;

    @Mock
    private InvoiceService invoiceService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SalesOrderController salesOrderController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(salesOrderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("cashier1", "n/a", List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private void stubCurrentStaff() {
        User user = new User();
        user.setId(STAFF_ID);
        user.setUsername("cashier1");
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.of(user));
    }

    private SalesOrderResponse buildResponse() {
        return SalesOrderResponse.builder()
                .id(999)
                .orderCode("SO-ABC12345")
                .paymentMethod("CASH")
                .orderStatus("COMPLETED")
                .isDebt(false)
                .subtotal(new BigDecimal("100"))
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("100"))
                .paidAmount(new BigDecimal("100"))
                .createdAt(Instant.parse("2026-07-25T10:15:30Z"))
                .items(List.of())
                .build();
    }

    private String validPayload() {
        return """
                {
                  "customerId": null,
                  "paymentMethod": "CASH",
                  "discountAmount": 0,
                  "note": "Test note",
                  "items": [
                    { "productId": 1, "batchId": null, "productUnitId": null,
                      "quantity": 2, "unitPrice": 50, "discountAmount": 0 }
                  ]
                }
                """;
    }

    // =========================================================================
    // TEST CASES FOR POST /api/sales-orders
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. createOrder - Success
    // Condition: valid payload, authenticated cashier
    // Confirm: 201 CREATED with a fully populated ApiResponse envelope
    // (regression guard: ApiResponse.success used to be a stub returning null,
    // which made this endpoint fail to compile / return an empty body)
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should return 201 with the created order envelope")
    void createOrder_validRequest_returns201() throws Exception {
        stubCurrentStaff();
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), eq(false), eq(STAFF_ID)))
                .thenReturn(buildResponse());

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(1000))
                .andExpect(jsonPath("$.message").value("Tạo đơn hàng thành công"))
                .andExpect(jsonPath("$.result").exists())
                .andExpect(jsonPath("$.result.id").value(999))
                .andExpect(jsonPath("$.result.orderCode").value("SO-ABC12345"))
                .andExpect(jsonPath("$.result.orderStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.result.totalAmount").value(100));
    }

    // -------------------------------------------------------------------------
    // 2. createOrder - Request body is bound and forwarded correctly
    // Condition: valid payload with customer, discount and one item
    // Confirm: the service receives the deserialized request, isDebt=false and
    // the staff id resolved from the JWT principal
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should forward the bound request with isDebt=false")
    void createOrder_bindsPayloadAndResolvesStaffId() throws Exception {
        stubCurrentStaff();
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), anyBoolean(), any()))
                .thenReturn(buildResponse());

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": 7,
                                  "paymentMethod": "TRANSFER",
                                  "discountAmount": 10,
                                  "note": "ship sau",
                                  "items": [
                                    { "productId": 1, "productUnitId": 5, "quantity": 2, "unitPrice": 50 },
                                    { "productId": 2, "quantity": 3, "unitPrice": 20, "discountAmount": 5 }
                                  ]
                                }
                                """))
                .andExpect(status().isCreated());

        var captor = org.mockito.ArgumentCaptor.forClass(CreateSalesOrderRequest.class);
        verify(salesOrderService).createOrder(captor.capture(), eq(false), eq(STAFF_ID));

        CreateSalesOrderRequest sent = captor.getValue();
        assertThat(sent.getCustomerId()).isEqualTo(7);
        assertThat(sent.getPaymentMethod()).isEqualTo("TRANSFER");
        assertThat(sent.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("10"));
        assertThat(sent.getItems()).hasSize(2);
        assertThat(sent.getItems().get(0).getProductUnitId()).isEqualTo(5);
        assertThat(sent.getItems().get(0).getQuantity()).isEqualTo(2);
        assertThat(sent.getItems().get(1).getDiscountAmount()).isEqualByComparingTo(new BigDecimal("5"));
    }

    // -------------------------------------------------------------------------
    // 3. createOrder - Insufficient stock from FEFO deduction
    // Condition: the service throws InsufficientStockException
    // Confirm: 400 BAD_REQUEST with the INSUFFICIENT_STOCK code and the
    // exception's message (which names the product and the shortfall)
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should return 400 when stock is insufficient")
    void createOrder_insufficientStock_returns400() throws Exception {
        stubCurrentStaff();
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), anyBoolean(), any()))
                .thenThrow(new InsufficientStockException(
                        "Sản phẩm với ID: 1Không đủ tồn kho. Cần 2, nhưng chỉ còn 1"));

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1029))
                .andExpect(jsonPath("$.message").value(
                        "Sản phẩm với ID: 1Không đủ tồn kho. Cần 2, nhưng chỉ còn 1"))
                .andExpect(jsonPath("$.result").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // 4. createOrder - Product/customer not found
    // Condition: the service throws ResponseStatusException 404
    // Confirm: the 404 status is propagated to the client
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should return 404 when a referenced entity is missing")
    void createOrder_entityNotFound_returns404() throws Exception {
        stubCurrentStaff();
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), anyBoolean(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với mã: 1"));

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với mã: 1"));
    }

    // -------------------------------------------------------------------------
    // 5. createOrder - Validation: empty items
    // Condition: items array is empty
    // Confirm: 400 with the Vietnamese @NotEmpty message, service never called
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should reject an order with no items")
    void createOrder_emptyItems_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "paymentMethod": "CASH", "items": [] }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Đơn hàng phải có ít nhất một sản phẩm"));

        verifyNoInteractions(salesOrderService);
    }

    // -------------------------------------------------------------------------
    // 6. createOrder - Validation: missing payment method
    // Condition: paymentMethod is absent
    // Confirm: 400 with the @NotNull message, service never called
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should reject a missing payment method")
    void createOrder_missingPaymentMethod_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [ { "productId": 1, "quantity": 1, "unitPrice": 50 } ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Phương thức thanh toán không được để trống"));

        verifyNoInteractions(salesOrderService);
    }

    // -------------------------------------------------------------------------
    // 7. createOrder - Validation: non-positive quantity on a nested item
    // Condition: item quantity is 0 (@Min(1) on the nested @Valid item)
    // Confirm: 400, service never called - a zero-qty line would otherwise be a
    // silent no-op in the FEFO deduction
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should reject an item with quantity 0")
    void createOrder_zeroQuantity_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paymentMethod": "CASH",
                                  "items": [ { "productId": 1, "quantity": 0, "unitPrice": 50 } ]
                                }
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(salesOrderService);
    }

    // -------------------------------------------------------------------------
    // 8. createOrder - Validation: missing productId on a nested item
    // Condition: item has no productId
    // Confirm: 400 with the nested @NotNull message
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should reject an item without productId")
    void createOrder_missingProductId_returns400() throws Exception {
        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paymentMethod": "CASH",
                                  "items": [ { "quantity": 1, "unitPrice": 50 } ]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("productId không được để trống"));

        verifyNoInteractions(salesOrderService);
    }

    // =========================================================================
    // TEST CASES FOR POST /api/sales-orders/debt
    // =========================================================================

    // -------------------------------------------------------------------------
    // 9. createDebtOrder - Success
    // Condition: valid payload on the /debt route
    // Confirm: 200 OK, isDebt=true forwarded, debt-specific message
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders/debt should create the order with isDebt=true")
    void createDebtOrder_validRequest_forwardsIsDebtTrue() throws Exception {
        stubCurrentStaff();
        SalesOrderResponse debtResponse = SalesOrderResponse.builder()
                .id(1000)
                .orderCode("SO-DEBT0001")
                .orderStatus("COMPLETED")
                .isDebt(true)
                .subtotal(new BigDecimal("100"))
                .totalAmount(new BigDecimal("100"))
                .paidAmount(BigDecimal.ZERO)
                .items(List.of())
                .build();
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), eq(true), eq(STAFF_ID)))
                .thenReturn(debtResponse);

        mockMvc.perform(post(PATH + "/debt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Tạo đơn hàng nợ thành công"))
                .andExpect(jsonPath("$.result.isDebt").value(true))
                .andExpect(jsonPath("$.result.paidAmount").value(0));

        verify(salesOrderService).createOrder(any(CreateSalesOrderRequest.class), eq(true), eq(STAFF_ID));
    }

    // -------------------------------------------------------------------------
    // 10. createOrder - Unknown principal
    // Condition: the authenticated username has no matching user row
    // Confirm: createdBy is forwarded as null rather than failing the request
    // (documents current resolveStaffId behaviour)
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/sales-orders should forward a null staff id when the user is unknown")
    void createOrder_unknownPrincipal_forwardsNullStaffId() throws Exception {
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.empty());
        when(salesOrderService.createOrder(any(CreateSalesOrderRequest.class), eq(false), eq(null)))
                .thenReturn(buildResponse());

        mockMvc.perform(post(PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isCreated());

        verify(salesOrderService).createOrder(any(CreateSalesOrderRequest.class), eq(false), eq(null));
    }
}
