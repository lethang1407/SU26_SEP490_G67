package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.be_sep490_g67.entity.BatchLocation;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.entity.StockMovement;
import project.be_sep490_g67.entity.StorageLocation;
import project.be_sep490_g67.exception.InsufficientStockException;
import project.be_sep490_g67.repository.BatchLocationRepository;
import project.be_sep490_g67.repository.StockMovementRepository;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the FEFO stock deduction used by POS order creation.
 *
 * The repository query is responsible for the FEFO ordering itself
 * (ORDER BY expiryDate ASC, receivedDate ASC), so these tests feed the service
 * an already-ordered list and assert that it consumes it front-to-back.
 */
@ExtendWith(MockitoExtension.class)
class StockDeductionServiceTest {

    private static final Integer PRODUCT_ID = 1;
    private static final Integer ORDER_ID = 999;
    private static final Integer USER_ID = 100;

    @Mock
    private BatchLocationRepository batchLocationRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @InjectMocks
    private StockDeductionService stockDeductionService;

    @Captor
    private ArgumentCaptor<StockMovement> movementCaptor;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private BatchLocation buildBatchLocation(Integer id, Integer batchId, int quantity, LocalDate expiry) {
        StockBatch batch = new StockBatch();
        batch.setId(batchId);
        batch.setExpiryDate(expiry);
        batch.setReceivedDate(LocalDate.of(2026, 1, 1));

        StorageLocation location = new StorageLocation();
        location.setId(batchId);
        location.setLabel("A-" + batchId);

        BatchLocation bl = new BatchLocation();
        bl.setId(id);
        bl.setBatch(batch);
        bl.setLocation(location);
        bl.setQuantity(quantity);
        return bl;
    }

    // =========================================================================
    // TEST CASES FOR deductStock
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1. deductStock - Single batch covers the demand
    // Condition: one available batch location with more stock than needed
    // Confirm: quantity is reduced, one SALE movement written with the order ref
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should deduct from a single batch location and record one movement")
    void deductStock_singleBatchCoversDemand() {
        BatchLocation bl = buildBatchLocation(1, 10, 50, LocalDate.of(2026, 12, 31));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(bl));

        stockDeductionService.deductStock(PRODUCT_ID, 20, ORDER_ID, USER_ID);

        assertThat(bl.getQuantity()).isEqualTo(30);
        assertThat(bl.getUpdatedAt()).isNotNull();
        verify(batchLocationRepository, times(1)).save(bl);

        verify(stockMovementRepository, times(1)).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getStockBatch()).isSameAs(bl.getBatch());
        assertThat(movement.getBatchLocation()).isSameAs(bl);
        assertThat(movement.getQuantityDelta()).isEqualTo(-20);
        assertThat(movement.getStockAfter()).isEqualTo(30);
        assertThat(movement.getMovementType()).isEqualTo("SALE");
        assertThat(movement.getReferenceType()).isEqualTo("SALES_ORDER");
        assertThat(movement.getReferenceId()).isEqualTo(ORDER_ID);
    }

    // -------------------------------------------------------------------------
    // 2. deductStock - FEFO split across batches
    // Condition: demand (30) exceeds the first (nearest-expiry) batch's 10 units
    // Confirm: first batch drained to 0, remainder taken from the next batch,
    // one movement per touched location with the correct running stockAfter
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should consume batches front-to-back (FEFO) and split the remainder")
    void deductStock_splitsAcrossBatchesInFefoOrder() {
        BatchLocation near = buildBatchLocation(1, 10, 10, LocalDate.of(2026, 8, 1));
        BatchLocation far = buildBatchLocation(2, 20, 40, LocalDate.of(2027, 8, 1));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(near, far));

        stockDeductionService.deductStock(PRODUCT_ID, 30, ORDER_ID, USER_ID);

        assertThat(near.getQuantity()).isZero();
        assertThat(far.getQuantity()).isEqualTo(20);

        verify(stockMovementRepository, times(2)).save(movementCaptor.capture());
        List<StockMovement> movements = movementCaptor.getAllValues();

        // nearest expiry is consumed first and fully
        assertThat(movements.get(0).getBatchLocation()).isSameAs(near);
        assertThat(movements.get(0).getQuantityDelta()).isEqualTo(-10);
        assertThat(movements.get(0).getStockAfter()).isZero();

        // remainder comes from the later-expiring batch
        assertThat(movements.get(1).getBatchLocation()).isSameAs(far);
        assertThat(movements.get(1).getQuantityDelta()).isEqualTo(-20);
        assertThat(movements.get(1).getStockAfter()).isEqualTo(20);

        // total deducted equals the demand
        assertThat(movements.stream().mapToInt(StockMovement::getQuantityDelta).sum()).isEqualTo(-30);
    }

    // -------------------------------------------------------------------------
    // 3. deductStock - Stops as soon as the demand is met
    // Condition: three available batches, demand satisfied by the first two
    // Confirm: the third batch is left untouched (no save, no movement)
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should stop iterating once the required quantity is covered")
    void deductStock_stopsWhenDemandIsMet() {
        BatchLocation first = buildBatchLocation(1, 10, 5, LocalDate.of(2026, 8, 1));
        BatchLocation second = buildBatchLocation(2, 20, 5, LocalDate.of(2026, 9, 1));
        BatchLocation untouched = buildBatchLocation(3, 30, 100, LocalDate.of(2027, 1, 1));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID))
                .thenReturn(List.of(first, second, untouched));

        stockDeductionService.deductStock(PRODUCT_ID, 10, ORDER_ID, USER_ID);

        assertThat(untouched.getQuantity()).isEqualTo(100);
        verify(batchLocationRepository, never()).save(untouched);
        verify(batchLocationRepository, times(2)).save(any(BatchLocation.class));
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    // -------------------------------------------------------------------------
    // 4. deductStock - Demand exactly equals total stock
    // Condition: demand equals the sum of all available quantities
    // Confirm: every batch is drained to 0, no exception
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should succeed when demand exactly equals available stock")
    void deductStock_exactStock_drainsAllBatches() {
        BatchLocation first = buildBatchLocation(1, 10, 15, LocalDate.of(2026, 8, 1));
        BatchLocation second = buildBatchLocation(2, 20, 25, LocalDate.of(2026, 9, 1));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(first, second));

        stockDeductionService.deductStock(PRODUCT_ID, 40, ORDER_ID, USER_ID);

        assertThat(first.getQuantity()).isZero();
        assertThat(second.getQuantity()).isZero();
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    // -------------------------------------------------------------------------
    // 5. deductStock - Insufficient stock
    // Condition: demand (60) exceeds the total available stock (50)
    // Confirm: throws InsufficientStockException BEFORE any write, so the
    // transaction never leaves a partially deducted batch behind
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw InsufficientStockException without deducting anything")
    void deductStock_insufficientStock_throwsAndWritesNothing() {
        BatchLocation first = buildBatchLocation(1, 10, 30, LocalDate.of(2026, 8, 1));
        BatchLocation second = buildBatchLocation(2, 20, 20, LocalDate.of(2026, 9, 1));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(first, second));

        assertThatThrownBy(() -> stockDeductionService.deductStock(PRODUCT_ID, 60, ORDER_ID, USER_ID))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("60")
                .hasMessageContaining("50");

        assertThat(first.getQuantity()).isEqualTo(30);
        assertThat(second.getQuantity()).isEqualTo(20);
        verify(batchLocationRepository, never()).save(any());
        verify(stockMovementRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // 6. deductStock - No stock at all
    // Condition: the FEFO query returns an empty list
    // Confirm: throws InsufficientStockException reporting 0 available
    // Result: Type A
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should throw InsufficientStockException when no batch is available")
    void deductStock_noAvailableBatch_throws() {
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> stockDeductionService.deductStock(PRODUCT_ID, 1, ORDER_ID, USER_ID))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("chỉ còn 0");

        verifyNoInteractions(stockMovementRepository);
    }

    // -------------------------------------------------------------------------
    // 7. deductStock - Every movement carries the sales order reference
    // Condition: demand split over two batches
    // Confirm: all movements reference the same order id / SALES_ORDER type,
    // which is what the stock audit trail is queried by
    // Result: Type N
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should stamp every movement with the sales order reference")
    void deductStock_allMovementsCarryOrderReference() {
        BatchLocation first = buildBatchLocation(1, 10, 5, LocalDate.of(2026, 8, 1));
        BatchLocation second = buildBatchLocation(2, 20, 5, LocalDate.of(2026, 9, 1));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(first, second));

        stockDeductionService.deductStock(PRODUCT_ID, 8, ORDER_ID, USER_ID);

        verify(stockMovementRepository, times(2)).save(movementCaptor.capture());
        assertThat(movementCaptor.getAllValues())
                .allSatisfy(m -> {
                    assertThat(m.getReferenceId()).isEqualTo(ORDER_ID);
                    assertThat(m.getReferenceType()).isEqualTo("SALES_ORDER");
                    assertThat(m.getMovementType()).isEqualTo("SALE");
                });
    }

    // -------------------------------------------------------------------------
    // 8. deductStock - Zero-quantity request
    // Condition: quantityNeed is 0 (defensive: DTO validation should block this)
    // Confirm: no batch is written and no movement is recorded
    // Result: Type B
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Should be a no-op when the requested quantity is zero")
    void deductStock_zeroQuantity_isNoOp() {
        BatchLocation bl = buildBatchLocation(1, 10, 50, LocalDate.of(2026, 12, 31));
        when(batchLocationRepository.findAvailableByProductId(PRODUCT_ID)).thenReturn(List.of(bl));

        stockDeductionService.deductStock(PRODUCT_ID, 0, ORDER_ID, USER_ID);

        assertThat(bl.getQuantity()).isEqualTo(50);
        verify(batchLocationRepository, never()).save(any());
        verifyNoInteractions(stockMovementRepository);
    }
}
