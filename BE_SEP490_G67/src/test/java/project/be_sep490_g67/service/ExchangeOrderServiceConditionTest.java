package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import project.be_sep490_g67.dto.request.CreateExchangeOrderRequest;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

/**
 * Covers item condition and batch-correct restock (v2 §5, G4/G5) — Phase 6.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExchangeOrderServiceConditionTest {

    private static final int ORDER_ID = 500;
    private static final int LINE_ID = 900;
    private static final int SOLD_FROM_BATCH = 3;
    private static final int OTHER_BATCH = 99;

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

    private BatchLocation shelf;

    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------

    private SalesOrder buildOrder(boolean productReturnable, boolean recordSoldBatch) {
        Product coca = new Product();
        coca.setId(7);
        coca.setName("Coca 330ml");
        coca.setIsReturnable(productReturnable);

        SalesOrderDetail line = new SalesOrderDetail();
        line.setId(LINE_ID);
        line.setProduct(coca);
        line.setQuantity(5);
        line.setUnitPrice(new BigDecimal("10000"));
        line.setUnitName("Chai");
        line.setIsRemoved(false);

        if (recordSoldBatch) {
            StockBatch soldFrom = new StockBatch();
            soldFrom.setId(SOLD_FROM_BATCH);
            line.setStockBatch(soldFrom);
        }

        SalesOrder order = new SalesOrder();
        order.setId(ORDER_ID);
        order.setOrderCode("HD-01-260803-0007");
        order.setCreatedAt(Instant.now());
        order.setSalesOrderDetails(new LinkedHashSet<>(List.of(line)));
        line.setSalesOrder(order);
        return order;
    }

    private void stubCommon(SalesOrder order) {
        StoreConfig config = new StoreConfig();
        config.setId(1);
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(order));
        when(returnOrderDetailRepository.sumReturnedQuantityByOrder(ORDER_ID)).thenReturn(List.of());
        when(documentCodeService.generate(any())).thenReturn("HDT-01-260803-0001");
        when(returnOrderRepository.save(any(ReturnOrder.class))).thenAnswer(inv -> {
            ReturnOrder saved = inv.getArgument(0);
            saved.setId(77);
            return saved;
        });

        StockBatch fallback = new StockBatch();
        fallback.setId(OTHER_BATCH);
        when(stockBatchRepository.findFirstAvailableBatchByProductId(anyInt()))
                .thenReturn(Optional.of(fallback));
        when(stockMovementRepository.sumQuantityDeltaByBatchId(anyInt())).thenReturn(100);

        shelf = new BatchLocation();
        shelf.setId(11);
        shelf.setQuantity(20);
        when(batchLocationRepository.findFirstByBatchId(anyInt())).thenReturn(Optional.of(shelf));
    }

    private CreateExchangeOrderRequest request(String condition) {
        CreateExchangeOrderRequest.ReturnItemRequest item =
                new CreateExchangeOrderRequest.ReturnItemRequest();
        item.setSalesOrderDetailId(LINE_ID);
        item.setProductId(7);
        item.setQuantity(2);
        item.setItemCondition(condition);

        CreateExchangeOrderRequest request = new CreateExchangeOrderRequest();
        request.setOriginalOrderId(ORDER_ID);
        request.setReturnItems(new ArrayList<>(List.of(item)));
        request.setRefundMethod("CASH");
        return request;
    }

    private StockMovement capturedMovement() {
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, atLeastOnce()).save(captor.capture());
        return captor.getValue();
    }

    // -------------------------------------------------------------------------
    // 1. Condition is mandatory (item 46)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("A returned line with no condition is rejected")
    void missingCondition_isRejected() {
        stubCommon(buildOrder(true, true));

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(null), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ITEM_CONDITION_REQUIRED);
    }

    @Test
    @DisplayName("A blank condition is rejected rather than defaulted")
    void blankCondition_isRejected() {
        stubCommon(buildOrder(true, true));

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request("  "), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ITEM_CONDITION_REQUIRED);
    }

    @Test
    @DisplayName("An unrecognised condition is rejected")
    void unknownCondition_isRejected() {
        stubCommon(buildOrder(true, true));

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request("SOGGY"), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_ITEM_CONDITION);
    }

    @Test
    @DisplayName("The condition is persisted on the returned line")
    void condition_isPersisted() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("DAMAGED"), 100);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ReturnOrderDetail>> captor = ArgumentCaptor.forClass(List.class);
        verify(returnOrderDetailRepository, atLeastOnce()).saveAll(captor.capture());
        assertThat(captor.getValue().get(0).getItemCondition()).isEqualTo("DAMAGED");
    }

    // -------------------------------------------------------------------------
    // 2. Restock by condition (item 44, G4)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("RESELLABLE goods go back into sellable stock")
    void resellable_isRestocked() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("RESELLABLE"), 100);

        StockMovement movement = capturedMovement();
        assertThat(movement.getMovementType()).isEqualTo("RETURN");
        assertThat(movement.getQuantityDelta()).isEqualTo(2);
    }

    @Test
    @DisplayName("RESELLABLE goods increment the shelf, not just the ledger")
    void resellable_incrementsBatchLocation() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("RESELLABLE"), 100);

        // 20 on the shelf + 2 returned. Without this the goods are recorded as
        // returned but the FEFO query never sees them.
        assertThat(shelf.getQuantity()).isEqualTo(22);
        verify(batchLocationRepository).save(shelf);
    }

    @Test
    @DisplayName("DAMAGED goods are written off, not restocked (G4)")
    void damaged_isWrittenOff() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("DAMAGED"), 100);

        StockMovement movement = capturedMovement();
        assertThat(movement.getMovementType()).isEqualTo("WRITE_OFF");
        assertThat(movement.getQuantityDelta()).isZero();
        assertThat(shelf.getQuantity()).isEqualTo(20);
        verify(batchLocationRepository, never()).save(any());
    }

    @Test
    @DisplayName("EXPIRED goods never become sellable again")
    void expired_isWrittenOff() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("EXPIRED"), 100);

        assertThat(capturedMovement().getMovementType()).isEqualTo("WRITE_OFF");
        assertThat(shelf.getQuantity()).isEqualTo(20);
    }

    @Test
    @DisplayName("OPENED goods are written off")
    void opened_isWrittenOff() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("OPENED"), 100);

        assertThat(capturedMovement().getMovementType()).isEqualTo("WRITE_OFF");
    }

    // -------------------------------------------------------------------------
    // 3. Batch correctness (item 43/44, G5)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Stock goes back into the batch it was sold from")
    void restock_usesTheOriginalBatch() {
        stubCommon(buildOrder(true, true));

        exchangeOrderService.processExchangeOrder(request("RESELLABLE"), 100);

        assertThat(capturedMovement().getStockBatch().getId()).isEqualTo(SOLD_FROM_BATCH);
        verify(stockBatchRepository, never()).findFirstAvailableBatchByProductId(anyInt());
    }

    @Test
    @DisplayName("A line sold before V14 falls back to the first available batch")
    void restock_fallsBackWhenOriginalBatchUnknown() {
        stubCommon(buildOrder(true, false));

        exchangeOrderService.processExchangeOrder(request("RESELLABLE"), 100);

        assertThat(capturedMovement().getStockBatch().getId()).isEqualTo(OTHER_BATCH);
    }

    // -------------------------------------------------------------------------
    // 4. Non-returnable products (item 45)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("A non-returnable product cannot be returned in good condition")
    void nonReturnableProduct_isBlocked() {
        stubCommon(buildOrder(false, true));

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request("RESELLABLE"), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PRODUCT_NOT_RETURNABLE);
    }

    @Test
    @DisplayName("DAMAGED overrides the non-returnable policy")
    void nonReturnableProduct_damagedIsAllowed() {
        stubCommon(buildOrder(false, true));

        exchangeOrderService.processExchangeOrder(request("DAMAGED"), 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("EXPIRED overrides the non-returnable policy")
    void nonReturnableProduct_expiredIsAllowed() {
        stubCommon(buildOrder(false, true));

        exchangeOrderService.processExchangeOrder(request("EXPIRED"), 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("OPENED does NOT override the policy — it is the customer's doing")
    void nonReturnableProduct_openedIsBlocked() {
        stubCommon(buildOrder(false, true));

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request("OPENED"), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PRODUCT_NOT_RETURNABLE);
    }
}
