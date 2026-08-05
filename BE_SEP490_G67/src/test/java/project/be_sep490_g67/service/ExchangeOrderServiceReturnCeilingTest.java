package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import project.be_sep490_g67.dto.request.CreateExchangeOrderRequest;
import project.be_sep490_g67.dto.response.ExchangeOrderDetailResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.enums.SalesOrderStatus;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Covers the cumulative returnable ceiling (v2 §3.2) and the derived order
 * status (v2 G3) — the two rules Phase 3 exists to introduce.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExchangeOrderServiceReturnCeilingTest {

    private static final int ORDER_ID = 500;
    private static final int LINE_ID = 900;

    @Mock private DocumentCodeService documentCodeService;
    @Mock private SalesOrderRepository salesOrderRepository;
    @Mock private SalesOrderDetailRepository salesOrderDetailRepository;
    @Mock private ReturnOrderRepository returnOrderRepository;
    @Mock private ReturnOrderDetailRepository returnOrderDetailRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockBatchRepository stockBatchRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private ProductUnitRepository productUnitRepository;
    @Mock private StoreConfigRepository storeConfigRepository;
    @Mock private BatchLocationRepository batchLocationRepository;

    @InjectMocks private ExchangeOrderService exchangeOrderService;

    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------

    /** One order, one line: 10 bottles of Coca (the v2 §3.1 scenario). */
    private SalesOrder orderWithCocaLine(int soldQuantity) {
        Product coca = new Product();
        coca.setId(7);
        coca.setName("Coca 330ml");

        SalesOrderDetail line = new SalesOrderDetail();
        line.setId(LINE_ID);
        line.setProduct(coca);
        line.setQuantity(soldQuantity);
        line.setUnitPrice(new BigDecimal("10000"));
        line.setUnitName("Chai");
        line.setIsRemoved(false);

        SalesOrder order = new SalesOrder();
        order.setId(ORDER_ID);
        order.setOrderCode("HD-01-260803-0007");
        order.setOrderStatus(SalesOrderStatus.COMPLETED.name());
        order.setCreatedAt(Instant.now());
        order.setTotalAmount(new BigDecimal("100000"));
        order.setSalesOrderDetails(new LinkedHashSet<>(List.of(line)));

        line.setSalesOrder(order);
        return order;
    }

    private void givenAlreadyReturned(int quantity) {
        List<Object[]> rows = quantity == 0
                ? List.of()
                : List.<Object[]>of(new Object[]{LINE_ID, (long) quantity});
        when(returnOrderDetailRepository.sumReturnedQuantityByOrder(ORDER_ID)).thenReturn(rows);
    }

    private void givenReturnWindow(Integer days) {
        StoreConfig config = new StoreConfig();
        config.setId(1);
        config.setReturnWindowDays(days);
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));
    }

    private CreateExchangeOrderRequest returnRequest(int quantity) {
        CreateExchangeOrderRequest.ReturnItemRequest item =
                new CreateExchangeOrderRequest.ReturnItemRequest();
        item.setSalesOrderDetailId(LINE_ID);
        item.setProductId(7);
        item.setQuantity(quantity);
        item.setItemCondition(ItemCondition.RESELLABLE.name());

        CreateExchangeOrderRequest request = new CreateExchangeOrderRequest();
        request.setOriginalOrderId(ORDER_ID);
        request.setReturnItems(new ArrayList<>(List.of(item)));
        request.setRefundMethod("CASH");
        return request;
    }

    private void stubHappyPathWrites(SalesOrder order) {
        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(order));
        when(documentCodeService.generate(any())).thenReturn("HDT-01-260803-0001");
        when(returnOrderRepository.save(any(ReturnOrder.class))).thenAnswer(inv -> {
            ReturnOrder saved = inv.getArgument(0);
            saved.setId(77);
            return saved;
        });

        // Restock path
        StockBatch batch = new StockBatch();
        batch.setId(3);
        when(stockBatchRepository.findFirstAvailableBatchByProductId(anyInt()))
                .thenReturn(Optional.of(batch));
        when(stockMovementRepository.sumQuantityDeltaByBatchId(anyInt())).thenReturn(100);
    }

    // -------------------------------------------------------------------------
    // 1. The COCA scenario (v2 §3.1): 10 bought, 2 returned, 3 more, then 6
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Returning 3 more of 10 after 2 were already returned is allowed")
    void secondPartialReturn_withinCeiling_isAccepted() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(2);

        exchangeOrderService.processExchangeOrder(returnRequest(3), 100);

        verify(returnOrderDetailRepository).saveAll(any());
    }

    @Test
    @DisplayName("Returning 6 more when only 5 remain is rejected")
    void thirdPartialReturn_beyondCeiling_isRejected() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(5);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(returnRequest(6), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RETURN_QUANTITY_EXCEEDS_REMAINING);

        verify(returnOrderRepository, never()).save(any());
    }

    @Test
    @DisplayName("A prior return no longer blocks the order outright (G1)")
    void existingReturn_doesNotBlockANewOne() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(2);

        // v1 threw ORDER_ALREADY_RETURNED here regardless of quantities.
        exchangeOrderService.processExchangeOrder(returnRequest(1), 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("Two request rows against the same line are summed against the ceiling")
    void twoRowsSameLine_areSummed() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(8);

        CreateExchangeOrderRequest request = returnRequest(1);
        CreateExchangeOrderRequest.ReturnItemRequest second =
                new CreateExchangeOrderRequest.ReturnItemRequest();
        second.setSalesOrderDetailId(LINE_ID);
        second.setProductId(7);
        second.setQuantity(2);           // 1 + 2 = 3, but only 2 remain
        second.setItemCondition(ItemCondition.RESELLABLE.name());
        request.getReturnItems().add(second);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request, 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RETURN_QUANTITY_EXCEEDS_REMAINING);
    }

    // -------------------------------------------------------------------------
    // 2. Derived order status (G3)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Returning part of the order derives PARTIALLY_RETURNED")
    void partialReturn_derivesPartiallyReturned() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(3);

        exchangeOrderService.processExchangeOrder(returnRequest(1), 100);

        assertThat(order.getOrderStatus()).isEqualTo(SalesOrderStatus.PARTIALLY_RETURNED.name());
    }

    @Test
    @DisplayName("Returning every unit of every line derives RETURNED")
    void fullReturn_derivesReturned() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(10);

        exchangeOrderService.processExchangeOrder(returnRequest(0), 100);

        assertThat(order.getOrderStatus()).isEqualTo(SalesOrderStatus.RETURNED.name());
    }

    @Test
    @DisplayName("Status is never the v1 hardcoded string")
    void status_isNeverTheHardcodedString() {
        SalesOrder order = orderWithCocaLine(10);
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(1);

        exchangeOrderService.processExchangeOrder(returnRequest(1), 100);

        assertThat(order.getOrderStatus()).isNotEqualTo("ĐÃ ĐỔI/TRẢ");
    }

    // -------------------------------------------------------------------------
    // 3. Return window (G12 / item 17)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("A return after the window has closed is rejected")
    void returnAfterWindow_isRejected() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(30, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(7);
        givenAlreadyReturned(0);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(returnRequest(1), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RETURN_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("A return inside the window is accepted")
    void returnInsideWindow_isAccepted() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(2, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(7);
        givenAlreadyReturned(0);

        exchangeOrderService.processExchangeOrder(returnRequest(1), 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("Damaged goods are still returnable after the window closed")
    void damagedGoods_overrideExpiredWindow() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(30, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(7);
        givenAlreadyReturned(0);

        CreateExchangeOrderRequest request = returnRequest(1);
        request.getReturnItems().get(0).setItemCondition(ItemCondition.DAMAGED.name());

        exchangeOrderService.processExchangeOrder(request, 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("Expired goods are still returnable after the window closed")
    void expiredGoods_overrideExpiredWindow() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(30, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(7);
        givenAlreadyReturned(0);

        CreateExchangeOrderRequest request = returnRequest(1);
        request.getReturnItems().get(0).setItemCondition(ItemCondition.EXPIRED.name());

        exchangeOrderService.processExchangeOrder(request, 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("OPENED does not override an expired window")
    void openedGoods_doNotOverrideExpiredWindow() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(30, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(7);
        givenAlreadyReturned(0);

        CreateExchangeOrderRequest request = returnRequest(1);
        request.getReturnItems().get(0).setItemCondition(ItemCondition.OPENED.name());

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request, 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RETURN_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("A NULL window disables the check entirely")
    void nullWindow_disablesTheCheck() {
        SalesOrder order = orderWithCocaLine(10);
        order.setCreatedAt(Instant.now().minus(400, ChronoUnit.DAYS));
        stubHappyPathWrites(order);
        givenReturnWindow(null);
        givenAlreadyReturned(0);

        exchangeOrderService.processExchangeOrder(returnRequest(1), 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    // -------------------------------------------------------------------------
    // 4. The display side
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("The exchange screen reports đã mua / đã trả / còn per line")
    void getOrderForExchange_reportsRemainingPerLine() {
        SalesOrder order = orderWithCocaLine(10);
        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(order));
        givenAlreadyReturned(4);

        ExchangeOrderDetailResponse response = exchangeOrderService.getOrderForExchange(ORDER_ID);

        ExchangeOrderDetailResponse.OrderItemInfo item = response.getItems().get(0);
        assertThat(item.getQuantityPurchased()).isEqualTo(10);
        assertThat(item.getQuantityReturned()).isEqualTo(4);
        assertThat(item.getQuantityReturnable()).isEqualTo(6);
    }

    @Test
    @DisplayName("A previously returned order still opens on the exchange screen (G1)")
    void getOrderForExchange_doesNotRejectReturnedOrders() {
        SalesOrder order = orderWithCocaLine(10);
        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(order));
        givenAlreadyReturned(2);

        assertThat(exchangeOrderService.getOrderForExchange(ORDER_ID)).isNotNull();
    }

    @Test
    @DisplayName("Legacy return rows with no line link are ignored, not mis-attributed")
    void legacyRowsWithoutLineLink_areIgnored() {
        SalesOrder order = orderWithCocaLine(10);
        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(order));
        // The repository query filters these out, so the service sees no rows.
        when(returnOrderDetailRepository.sumReturnedQuantityByOrder(ORDER_ID)).thenReturn(List.of());

        ExchangeOrderDetailResponse response = exchangeOrderService.getOrderForExchange(ORDER_ID);

        assertThat(response.getItems().get(0).getQuantityReturnable()).isEqualTo(10);
    }
}
