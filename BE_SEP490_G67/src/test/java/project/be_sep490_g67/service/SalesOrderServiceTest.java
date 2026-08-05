package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.SalesOrderListResponse;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesOrderServiceTest {

    @Mock
    private SalesOrderRepository salesOrderRepository;

    @Mock
    private SalesOrderDetailRepository salesOrderDetailRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductUnitRepository productUnitRepository;

    @Mock
    private StockDeductionService stockDeductionService;

    @Mock
    private DocumentCodeService documentCodeService;

    @Mock
    private StockBatchRepository stockBatchRepository;

    @InjectMocks
    private SalesOrderService salesOrderService;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private CreateSalesOrderRequest buildRequest(Integer customerId, Integer productId, Integer batchId, Integer unitId,
            int quantity, BigDecimal price, BigDecimal itemDiscount, BigDecimal orderDiscount) {
        CreateSalesOrderRequest req = new CreateSalesOrderRequest();
        req.setCustomerId(customerId);
        req.setPaymentMethod("CASH");
        req.setNote("Test note");
        req.setDiscountAmount(orderDiscount);
        req.setItems(List.of(buildItem(productId, batchId, unitId, quantity, price, itemDiscount)));
        return req;
    }

    private CreateSalesOrderRequest.OrderItemRequest buildItem(Integer productId, Integer batchId, Integer unitId,
            int quantity, BigDecimal price, BigDecimal itemDiscount) {
        CreateSalesOrderRequest.OrderItemRequest item = new CreateSalesOrderRequest.OrderItemRequest();
        item.setProductId(productId);
        item.setBatchId(batchId);
        item.setProductUnitId(unitId);
        item.setQuantity(quantity);
        item.setUnitPrice(price);
        item.setDiscountAmount(itemDiscount);
        return item;
    }

    private Product buildProduct(Integer id, String name) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        ProductUnit baseUnit = new ProductUnit();
        baseUnit.setId(999);
        baseUnit.setName("BaseUnit");
        baseUnit.setUnitBase(BigDecimal.ONE);
        p.setProductUnits(Set.of(baseUnit));
        return p;
    }

    /** Stub salesOrderRepository.save so the persisted order comes back with an id. */
    private void stubOrderSave(Integer generatedId) {
        when(salesOrderRepository.save(any(SalesOrder.class))).thenAnswer(i -> {
            SalesOrder so = i.getArgument(0);
            so.setId(generatedId);
            return so;
        });
    }

    // =========================================================================
    // TEST CASES FOR createOrder
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. createOrder - Customer Not Found
    // Condition: customerId is provided but customerRepository returns empty
    // Confirm: Throws ResponseStatusException with 404 NOT_FOUND, nothing is saved
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw 404 when customer is not found")
    void createOrder_customerNotFound_throws404() {
        CreateSalesOrderRequest req = buildRequest(1, 1, null, null, 1, BigDecimal.TEN, BigDecimal.ZERO,
                BigDecimal.ZERO);
        when(customerRepository.findById(1)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salesOrderService.createOrder(req, false, 100))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        verify(salesOrderRepository, never()).save(any());
        verifyNoInteractions(stockDeductionService);
    }

    // -------------------------------------------------------------------------
    // 2. createOrder - Product Not Found
    // Condition: productId in items does not exist
    // Confirm: Throws ResponseStatusException with 404 NOT_FOUND, no stock deducted
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw 404 when product is not found")
    void createOrder_productNotFound_throws404() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 1, BigDecimal.TEN, BigDecimal.ZERO,
                BigDecimal.ZERO);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salesOrderService.createOrder(req, false, 100))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        verifyNoInteractions(stockDeductionService);
        verify(salesOrderDetailRepository, never()).saveAll(anyList());
    }

    // -------------------------------------------------------------------------
    // 3. createOrder - Insufficient Stock (FEFO deduction fails)
    // Condition: StockDeductionService reports not enough stock across all batches
    // Confirm: InsufficientStockException propagates, order details are not saved
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should propagate InsufficientStockException when FEFO stock is not enough")
    void createOrder_insufficientStock_propagatesException() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 100, BigDecimal.TEN, BigDecimal.ZERO,
                BigDecimal.ZERO);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));
        doThrow(new InsufficientStockException("Không đủ tồn kho"))
                .when(stockDeductionService).deductStock(1, 100, 999, 100);

        assertThatThrownBy(() -> salesOrderService.createOrder(req, false, 100))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Không đủ tồn kho");

        verify(salesOrderDetailRepository, never()).saveAll(anyList());
    }

    // -------------------------------------------------------------------------
    // 4. createOrder - Product Unit Not Found
    // Condition: explicit productUnitId provided but not found
    // Confirm: Throws ResponseStatusException with 404 NOT_FOUND
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw 404 when specific product unit is not found")
    void createOrder_unitNotFound_throws404() {
        CreateSalesOrderRequest req = buildRequest(null, 1, 10, 5, 1, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));
        when(productUnitRepository.findById(5)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salesOrderService.createOrder(req, false, 100))
                .isInstanceOf(ResponseStatusException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
    }

    // -------------------------------------------------------------------------
    // 5. createOrder - Success (Fallback Unit, No Debt)
    // Condition: all inputs valid, base unit fallback, not debt
    // Confirm: Returns SalesOrderResponse with proper calculations, stock deducted
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should create order successfully with fallback base unit")
    void createOrder_success_fallbackUnit_noDebt() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 2, new BigDecimal("50"), BigDecimal.ZERO,
                new BigDecimal("10"));
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));

        SalesOrderResponse response = salesOrderService.createOrder(req, false, 100);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(999);
        assertThat(response.getOrderStatus()).isEqualTo("COMPLETED");
        // subtotal = 2 * 50 = 100. discount = 10. total = 90. paid = 90.
        assertThat(response.getSubtotal()).isEqualByComparingTo(new BigDecimal("100"));
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("90"));
        assertThat(response.getPaidAmount()).isEqualByComparingTo(new BigDecimal("90"));
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getUnitName()).isEqualTo("BaseUnit");

        verify(stockDeductionService, times(1)).deductStock(1, 2, 999, 100);
        verify(salesOrderDetailRepository, times(1)).saveAll(anyList());
    }

    // -------------------------------------------------------------------------
    // 6. createOrder - Success (Explicit Unit, Is Debt)
    // Condition: explicit productUnitId provided, isDebt=true
    // Confirm: Returns SalesOrderResponse with paidAmount = 0 and the explicit unit
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should create order successfully with explicit unit, as debt")
    void createOrder_success_explicitUnit_isDebt() {
        CreateSalesOrderRequest req = buildRequest(null, 1, 10, 5, 2, new BigDecimal("50"), BigDecimal.ZERO,
                new BigDecimal("10"));
        ProductUnit u = new ProductUnit();
        u.setId(5);
        u.setName("Box");

        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));
        when(productUnitRepository.findById(5)).thenReturn(Optional.of(u));

        SalesOrderResponse response = salesOrderService.createOrder(req, true, 100);

        assertThat(response).isNotNull();
        assertThat(response.getIsDebt()).isTrue();
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("90"));
        assertThat(response.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getItems().get(0).getUnitName()).isEqualTo("Box");

        verify(stockDeductionService, times(1)).deductStock(1, 2, 999, 100);
    }

    // -------------------------------------------------------------------------
    // 7. createOrder - Multiple items
    // Condition: order contains two different products
    // Confirm: FEFO deduction is invoked once per line with the saved order id
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should deduct stock once per order line and sum the subtotal")
    void createOrder_multipleItems_deductsEachLine() {
        CreateSalesOrderRequest req = new CreateSalesOrderRequest();
        req.setPaymentMethod("CASH");
        req.setDiscountAmount(BigDecimal.ZERO);
        req.setItems(List.of(
                buildItem(1, null, null, 2, new BigDecimal("50"), BigDecimal.ZERO),
                buildItem(2, null, null, 3, new BigDecimal("20"), new BigDecimal("5"))));

        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));
        when(productRepository.findById(2)).thenReturn(Optional.of(buildProduct(2, "Product B")));

        SalesOrderResponse response = salesOrderService.createOrder(req, false, 100);

        // line1 = 2*50 = 100 ; line2 = 3*20 - 5 = 55 ; subtotal = 155
        assertThat(response.getSubtotal()).isEqualByComparingTo(new BigDecimal("155"));
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("155"));
        assertThat(response.getItems()).hasSize(2);

        verify(stockDeductionService, times(1)).deductStock(1, 2, 999, 100);
        verify(stockDeductionService, times(1)).deductStock(2, 3, 999, 100);
        verifyNoMoreInteractions(stockDeductionService);
    }

    // -------------------------------------------------------------------------
    // 8. createOrder - Order is persisted before stock deduction
    // Condition: valid single-item order
    // Confirm: order is saved first so deductStock receives a non-null order id
    // (stock_movements.reference_id must point at an existing sales order)
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should save the order before deducting stock so the movement has a reference id")
    void createOrder_savesOrderBeforeDeductingStock() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 1, new BigDecimal("50"), BigDecimal.ZERO,
                BigDecimal.ZERO);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));

        salesOrderService.createOrder(req, false, 100);

        InOrder inOrder = inOrder(salesOrderRepository, stockDeductionService, salesOrderDetailRepository);
        inOrder.verify(salesOrderRepository).save(any(SalesOrder.class));
        inOrder.verify(stockDeductionService).deductStock(eq(1), eq(1), eq(999), eq(100));
        inOrder.verify(salesOrderDetailRepository).saveAll(anyList());
    }

    // -------------------------------------------------------------------------
    // 8a. createOrder - Null order discount
    // Condition: discountAmount is null
    // Confirm: Returns SalesOrderResponse handling null as ZERO
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should create order successfully when order discount is null")
    void createOrder_nullOrderDiscount_usesZero() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 1, new BigDecimal("50"), BigDecimal.ZERO, null);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));

        SalesOrderResponse response = salesOrderService.createOrder(req, false, 100);

        assertThat(response.getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("50"));
    }

    // -------------------------------------------------------------------------
    // 8b. createOrder - Null item discount
    // Condition: item.discountAmount is null
    // Confirm: Returns SalesOrderResponse handling null as ZERO
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should create order successfully when item discount is null")
    void createOrder_nullItemDiscount_usesZero() {
        CreateSalesOrderRequest req = buildRequest(null, 1, null, null, 1, new BigDecimal("50"), null, BigDecimal.ZERO);
        stubOrderSave(999);
        when(productRepository.findById(1)).thenReturn(Optional.of(buildProduct(1, "Product A")));

        SalesOrderResponse response = salesOrderService.createOrder(req, false, 100);

        assertThat(response.getItems().get(0).getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("50"));
    }

    // =========================================================================
    // TEST CASES FOR getOrderHistory
    // =========================================================================

    // -------------------------------------------------------------------------
    // 11. getOrderHistory - Success
    // Condition: valid filters provided
    // Confirm: Returns mapped SalesOrderListResponse with pagination info
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should return order history page")
    void getOrderHistory_success_returnsPage() {
        SalesOrder order = new SalesOrder();
        order.setId(1);
        order.setOrderCode("SO-1");

        Page<SalesOrder> page = new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1);
        when(salesOrderRepository.findHistory(eq(100), anyString(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        SalesOrderListResponse response = salesOrderService.getOrderHistory(
                100, "SEARCH", null, null, null, null, null, 0, 10);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getPage()).isEqualTo(0);

        verify(salesOrderRepository, times(1)).findHistory(
                eq(100), eq("%search%"), isNull(), isNull(), isNull(), any(), any(), any(Pageable.class));
    }

    // -------------------------------------------------------------------------
    // 12. getOrderHistory - Null Search
    // Condition: search string is null or blank
    // Confirm: passes null to repository
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should handle null search string correctly")
    void getOrderHistory_nullSearch_passesNull() {
        Page<SalesOrder> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(salesOrderRepository.findHistory(eq(100), isNull(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        salesOrderService.getOrderHistory(100, "   ", null, null, null, null, null, 0, 10);
        verify(salesOrderRepository, times(1)).findHistory(
                eq(100), isNull(), isNull(), isNull(), isNull(), any(), any(), any(Pageable.class));
    }

    // -------------------------------------------------------------------------
    // 13. getOrderHistory - Large Size
    // Condition: size is greater than 50
    // Confirm: size is capped at 50
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should cap page size at 50")
    void getOrderHistory_largeSize_capsAt50() {
        Page<SalesOrder> page = new PageImpl<>(List.of(), PageRequest.of(0, 50), 0);
        when(salesOrderRepository.findHistory(eq(100), isNull(), any(), any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        salesOrderService.getOrderHistory(100, null, null, null, null, null, null, 0, 100);
        verify(salesOrderRepository, times(1)).findHistory(eq(100), isNull(), isNull(), isNull(), isNull(), any(), any(),
                argThat(pageable -> pageable.getPageSize() == 50));
    }
}
