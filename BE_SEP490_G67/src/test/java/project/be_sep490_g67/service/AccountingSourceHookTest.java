package project.be_sep490_g67.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.repository.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Verifies the actual operational services call accounting only after final financial values are set. */
@ExtendWith(MockitoExtension.class)
class AccountingSourceHookTest {
    @Mock AccountingService accountingService;
    @Mock DocumentCodeService documentCodeService;
    @Mock StockBatchRepository stockBatchRepository;
    @Mock SalesOrderRepository salesOrderRepository;
    @Mock SalesOrderDetailRepository salesOrderDetailRepository;
    @Mock ProductRepository productRepository;
    @Mock CustomerRepository customerRepository;
    @Mock ProductUnitRepository productUnitRepository;
    @Mock StockDeductionService stockDeductionService;
    @Mock DebtPaymentRepository debtPaymentRepository;
    @Mock ReturnOrderRepository returnOrderRepository;
    @Mock ReturnOrderDetailRepository returnOrderDetailRepository;
    @Mock UserRepository userRepository;
    @Mock DebtPolicy debtPolicy;
    @Mock NotificationService notificationService;
    @Mock StockMovementRepository stockMovementRepository;
    @Mock AlertThresholdConfigRepository alertThresholdConfigRepository;
    @Mock BatchLocationRepository batchLocationRepository;
    @Mock StorageLocationRepository storageLocationRepository;
    @InjectMocks SalesOrderService salesService;
    @InjectMocks ExchangeOrderService exchangeService;

    Product product() {
        Product p = new Product();
        p.setId(1);
        p.setName("Test product");
        p.setSellingPrice(new BigDecimal("100.00"));
        p.setProductUnits(new LinkedHashSet<>());
        return p;
    }
    void saveSales() {
        when(salesOrderRepository.save(any())).thenAnswer(inv -> {
            SalesOrder s = inv.getArgument(0);
            if (s.getId() == null) s.setId(2);
            return s;
        });
    }
    CreateSalesOrderRequest saleRequest() {
        saveSales();
        when(productRepository.findById(1)).thenReturn(Optional.of(product()));
        var item = new CreateSalesOrderRequest.OrderItemRequest();
        item.setProductId(1);
        item.setQuantity(1);
        item.setDiscountAmount(new BigDecimal("5.00"));
        var request = new CreateSalesOrderRequest();
        request.setItems(List.of(item));
        request.setPaymentMethod("CASH");
        request.setDiscountAmount(new BigDecimal("10.00"));
        return request;
    }
    @Test void saleHookReceivesFinalDiscountedAmountAfterDetailsSave() {
        var response = salesService.createOrder(saleRequest(), false, 1);
        assertEquals(new BigDecimal("85.00"), response.getTotalAmount());
        var order = ArgumentCaptor.forClass(SalesOrder.class);
        var sequence = inOrder(accountingService, salesOrderDetailRepository);
        sequence.verify(accountingService).lockForSourceWrite();
        sequence.verify(salesOrderDetailRepository).saveAll(any());
        sequence.verify(accountingService).recordSale(order.capture());
        assertEquals(new BigDecimal("85.00"), order.getValue().getTotalAmount());
    }
    @Test void ledgerFailureIsNotSwallowedBySaleWorkflow() {
        var request = saleRequest();
        RuntimeException failure = new IllegalStateException("ledger failed");
        doThrow(failure).when(accountingService).recordSale(any());
        assertSame(failure, assertThrows(RuntimeException.class, () -> salesService.createOrder(request, false, 1)));
    }
    CreateExchangeOrderRequest returnRequest(boolean replacement) {
        saveSales();
        Product product = product();
        SalesOrder original = new SalesOrder();
        original.setId(1);
        original.setCreatedAt(Instant.now().minusSeconds(60));
        original.setTotalAmount(new BigDecimal("90.00"));
        original.setSubtotal(new BigDecimal("100.00"));
        original.setDiscountAmount(new BigDecimal("10.00"));
        original.setPaidAmount(new BigDecimal("90.00"));
        original.setIsDebt(false);
        var batch = new StockBatch();
        batch.setId(1);
        var sold = new SalesOrderDetail();
        sold.setId(1);
        sold.setProduct(product);
        sold.setStockBatch(batch);
        sold.setSalesOrder(original);
        sold.setQuantity(1);
        sold.setUnitPrice(new BigDecimal("100.00"));
        sold.setLineTotal(new BigDecimal("100.00"));
        original.getSalesOrderDetails().add(sold);
        when(salesOrderRepository.findByIdWithDetails(1)).thenReturn(Optional.of(original));
        when(debtPolicy.remainingOf(original)).thenReturn(BigDecimal.ZERO);
        var config = new AlertThresholdConfig();
        config.setReturnWindowDays(30);
        when(alertThresholdConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));
        when(returnOrderRepository.save(any())).thenAnswer(inv -> {
            ReturnOrder r = inv.getArgument(0);
            r.setId(10);
            return r;
        });
        var item = new CreateExchangeOrderRequest.ReturnItemRequest();
        item.setProductId(1);
        item.setSalesOrderDetailId(1);
        item.setQuantity(1);
        item.setItemCondition("RESELLABLE");
        item.setResolutionType("REFUND");
        var request = new CreateExchangeOrderRequest();
        request.setOriginalOrderId(1);
        request.setRefundMethod("CASH");
        request.setReturnItems(List.of(item));
        if (replacement) {
            when(productRepository.findById(1)).thenReturn(Optional.of(product));
            var exchange = new CreateExchangeOrderRequest.ExchangeItemRequest();
            exchange.setProductId(1);
            exchange.setQuantity(1);
            request.setExchangeItems(List.of(exchange));
            request.setExchangeDiscount(new BigDecimal("5.00"));
        }
        return request;
    }
    @Test void returnHookReceivesAlreadyAllocatedRefund() {
        var result = exchangeService.processExchangeOrder(returnRequest(false), 1);
        assertEquals(0, new BigDecimal("90.00").compareTo(result.getTotalReturnAmount()));
        var returned = ArgumentCaptor.forClass(ReturnOrder.class);
        var sequence = inOrder(accountingService);
        sequence.verify(accountingService).lockForSourceWrite();
        sequence.verify(accountingService).recordReturn(returned.capture());
        assertEquals(0, new BigDecimal("90.00").compareTo(returned.getValue().getRefundAmount()));
        verify(accountingService, never()).recordSale(any());
    }
    @Test void exchangeHooksRecordReturnAndReplacementButNotOriginalSaleAgain() {
        exchangeService.processExchangeOrder(returnRequest(true), 1);
        var sold = ArgumentCaptor.forClass(SalesOrder.class);
        var sequence = inOrder(accountingService);
        sequence.verify(accountingService).lockForSourceWrite();
        sequence.verify(accountingService).recordReturn(any());
        sequence.verify(accountingService).recordSale(sold.capture());
        assertEquals(2, sold.getValue().getId());
        assertEquals(new BigDecimal("95.00"), sold.getValue().getTotalAmount());
    }
}

