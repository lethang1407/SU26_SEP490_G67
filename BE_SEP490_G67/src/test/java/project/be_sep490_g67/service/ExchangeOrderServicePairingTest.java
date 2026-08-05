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
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.enums.ResolutionType;
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
 * Covers per-line resolution types, line-to-line pairing (§3.2), the separate
 * exchange invoice (v2 G8) and the bearer rules (§5) — Phase 4's backend.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExchangeOrderServicePairingTest {

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

    private SalesOrder originalOrder;

    // -------------------------------------------------------------------------
    // Fixtures — one Coca line at 10.000, one unit returnable
    // -------------------------------------------------------------------------

    private SalesOrder buildOrder(Customer owner) {
        Product coca = new Product();
        coca.setId(7);
        coca.setName("Coca 330ml");

        SalesOrderDetail line = new SalesOrderDetail();
        line.setId(LINE_ID);
        line.setProduct(coca);
        line.setQuantity(2);
        line.setUnitPrice(new BigDecimal("10000"));
        line.setUnitName("Chai");
        line.setIsRemoved(false);

        SalesOrder order = new SalesOrder();
        order.setId(ORDER_ID);
        order.setOrderCode("HD-01-260803-0007");
        order.setCustomer(owner);
        order.setPaymentMethod("CASH");
        order.setCreatedAt(Instant.now());
        order.setSalesOrderDetails(new LinkedHashSet<>(List.of(line)));
        line.setSalesOrder(order);
        return order;
    }

    private void stubCommon(Customer owner) {
        originalOrder = buildOrder(owner);

        StoreConfig config = new StoreConfig();
        config.setId(1);
        config.setReturnWindowDays(null);
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(config));

        when(salesOrderRepository.findByIdWithDetails(ORDER_ID)).thenReturn(Optional.of(originalOrder));
        when(returnOrderDetailRepository.sumReturnedQuantityByOrder(ORDER_ID)).thenReturn(List.of());

        when(documentCodeService.generate(DocumentType.CREDIT_NOTE)).thenReturn("HDT-01-260803-0001");
        when(documentCodeService.generate(DocumentType.EXCHANGE_INVOICE)).thenReturn("HDD-01-260803-0001");

        when(returnOrderRepository.save(any(ReturnOrder.class))).thenAnswer(inv -> {
            ReturnOrder saved = inv.getArgument(0);
            saved.setId(77);
            return saved;
        });
        when(salesOrderRepository.save(any(SalesOrder.class))).thenAnswer(inv -> {
            SalesOrder saved = inv.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(1001);
            }
            return saved;
        });

        Product pepsi = new Product();
        pepsi.setId(8);
        pepsi.setName("Pepsi 330ml");
        pepsi.setProductUnits(new LinkedHashSet<>());
        when(productRepository.findById(8)).thenReturn(Optional.of(pepsi));

        StockBatch batch = new StockBatch();
        batch.setId(3);
        when(stockBatchRepository.findFirstAvailableBatchByProductId(anyInt())).thenReturn(Optional.of(batch));
        when(stockMovementRepository.sumQuantityDeltaByBatchId(anyInt())).thenReturn(100);
    }

    private CreateExchangeOrderRequest.ReturnItemRequest returnLine(
            ResolutionType resolution, String pairedRef) {
        CreateExchangeOrderRequest.ReturnItemRequest item =
                new CreateExchangeOrderRequest.ReturnItemRequest();
        item.setSalesOrderDetailId(LINE_ID);
        item.setProductId(7);
        item.setQuantity(1);
        item.setResolutionType(resolution == null ? null : resolution.name());
        item.setItemCondition(ItemCondition.RESELLABLE.name());
        item.setPairedExchangeItemRef(pairedRef);
        return item;
    }

    private CreateExchangeOrderRequest.ExchangeItemRequest exchangeLine(String ref, String price) {
        CreateExchangeOrderRequest.ExchangeItemRequest item =
                new CreateExchangeOrderRequest.ExchangeItemRequest();
        item.setRef(ref);
        item.setProductId(8);
        item.setQuantity(1);
        item.setUnitPrice(new BigDecimal(price));
        return item;
    }

    private CreateExchangeOrderRequest request(
            List<CreateExchangeOrderRequest.ReturnItemRequest> returns,
            List<CreateExchangeOrderRequest.ExchangeItemRequest> exchanges) {
        CreateExchangeOrderRequest request = new CreateExchangeOrderRequest();
        request.setOriginalOrderId(ORDER_ID);
        request.setReturnItems(new ArrayList<>(returns));
        request.setExchangeItems(new ArrayList<>(exchanges));
        request.setRefundMethod("CASH");
        return request;
    }

    @SuppressWarnings("unchecked")
    private List<ReturnOrderDetail> capturedReturnDetails() {
        ArgumentCaptor<List<ReturnOrderDetail>> captor = ArgumentCaptor.forClass(List.class);
        verify(returnOrderDetailRepository, atLeastOnce()).saveAll(captor.capture());
        return captor.getValue();
    }

    // -------------------------------------------------------------------------
    // 1. Pairing rules (§3.2)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("An even exchange links the returned line to its replacement")
    void evenExchange_setsPairing() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "10000"))), 100);

        ReturnOrderDetail detail = capturedReturnDetails().get(0);
        assertThat(detail.getResolutionType()).isEqualTo("EXCHANGE_EVEN");
        assertThat(detail.getPairedOutDetail()).isNotNull();
        assertThat(detail.getPairedOutDetail().getProduct().getId()).isEqualTo(8);
    }

    @Test
    @DisplayName("Rule 1: EXCHANGE_* without a replacement is rejected")
    void exchangeWithoutPairing_isRejected() {
        stubCommon(null);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_DIFF, null)),
                List.of(exchangeLine("x1", "12000"))), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EXCHANGE_REQUIRES_PAIRING);
    }

    @Test
    @DisplayName("Rule 1: REFUND with a replacement is rejected")
    void refundWithPairing_isRejected() {
        stubCommon(null);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.REFUND, "x1")),
                List.of(exchangeLine("x1", "10000"))), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PAIRING_NOT_ALLOWED_FOR_RESOLUTION);
    }

    @Test
    @DisplayName("Rule 3: one replacement cannot serve two returned lines")
    void replacementUsedTwice_isRejected() {
        stubCommon(null);
        originalOrder.getSalesOrderDetails().iterator().next().setQuantity(5);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1"),
                        returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "10000"))), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PAIRED_ITEM_ALREADY_USED);
    }

    @Test
    @DisplayName("An unknown replacement ref is rejected")
    void unknownRef_isRejected() {
        stubCommon(null);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "nope")),
                List.of(exchangeLine("x1", "10000"))), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PAIRED_ITEM_NOT_FOUND);
    }

    @Test
    @DisplayName("Rule 4: EXCHANGE_EVEN with unequal totals is rejected")
    void evenExchangeWithUnequalTotals_isRejected() {
        stubCommon(null);

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "12000"))), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EXCHANGE_EVEN_AMOUNT_MISMATCH);
    }

    @Test
    @DisplayName("EXCHANGE_DIFF accepts unequal totals")
    void diffExchangeWithUnequalTotals_isAccepted() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_DIFF, "x1")),
                List.of(exchangeLine("x1", "12000"))), 100);

        assertThat(capturedReturnDetails().get(0).getPairedOutDetail()).isNotNull();
    }

    @Test
    @DisplayName("An unpaired exchange line is an ordinary additional purchase")
    void unpairedExchangeLine_isAllowed() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.REFUND, null)),
                List.of(exchangeLine(null, "36000"))), 100);

        assertThat(capturedReturnDetails().get(0).getPairedOutDetail()).isNull();
    }

    @Test
    @DisplayName("An unknown resolution type is rejected rather than defaulted")
    void unknownResolution_isRejected() {
        stubCommon(null);
        CreateExchangeOrderRequest.ReturnItemRequest bad = returnLine(null, null);
        bad.setResolutionType("SOMETHING_ELSE");

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(
                request(List.of(bad), List.of()), 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_RESOLUTION_TYPE);
    }

    @Test
    @DisplayName("A missing resolution type defaults to REFUND")
    void missingResolution_defaultsToRefund() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(
                request(List.of(returnLine(null, null)), List.of()), 100);

        assertThat(capturedReturnDetails().get(0).getResolutionType()).isEqualTo("REFUND");
    }

    // -------------------------------------------------------------------------
    // 2. The exchange invoice is its own order (v2 G8)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Exchange lines go onto a new sales order, not the original")
    void exchangeLines_landOnTheirOwnOrder() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "10000"))), 100);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<SalesOrderDetail>> captor = ArgumentCaptor.forClass(List.class);
        verify(salesOrderDetailRepository).saveAll(captor.capture());

        SalesOrder host = captor.getValue().get(0).getSalesOrder();
        assertThat(host.getId()).isNotEqualTo(ORDER_ID);
        assertThat(host.getOrderCode()).isEqualTo("HDD-01-260803-0001");
    }

    @Test
    @DisplayName("The original order back-references the exchange invoice")
    void originalOrder_pointsAtTheExchangeInvoice() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "10000"))), 100);

        assertThat(originalOrder.getExchangeSalesOrder()).isNotNull();
        assertThat(originalOrder.getExchangeSalesOrder().getOrderCode()).isEqualTo("HDD-01-260803-0001");
    }

    @Test
    @DisplayName("A pure refund issues no exchange invoice")
    void pureRefund_issuesNoExchangeInvoice() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(
                request(List.of(returnLine(ResolutionType.REFUND, null)), List.of()), 100);

        verify(documentCodeService, never()).generate(DocumentType.EXCHANGE_INVOICE);
        assertThat(originalOrder.getExchangeSalesOrder()).isNull();
    }

    // -------------------------------------------------------------------------
    // 3. Bearer rules (§5)
    // -------------------------------------------------------------------------

    private Customer owner(String phone) {
        Customer customer = new Customer();
        customer.setId(42);
        customer.setFullName("Chị A");
        customer.setPhoneNumber(phone);
        return customer;
    }

    @Test
    @DisplayName("Cash refund to a non-owner without approval is blocked")
    void cashRefundToNonOwner_withoutApproval_isBlocked() {
        stubCommon(owner("0912000000"));

        CreateExchangeOrderRequest req = request(
                List.of(returnLine(ResolutionType.REFUND, null)), List.of());
        req.setBearerPhone("0987654321");
        req.setBearerName("Con chị A");

        assertThatThrownBy(() -> exchangeOrderService.processExchangeOrder(req, 100))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.MANAGER_APPROVAL_REQUIRED);
    }

    @Test
    @DisplayName("Cash refund to a non-owner with manager approval is allowed")
    void cashRefundToNonOwner_withApproval_isAllowed() {
        stubCommon(owner("0912000000"));

        CreateExchangeOrderRequest req = request(
                List.of(returnLine(ResolutionType.REFUND, null)), List.of());
        req.setBearerPhone("0987654321");
        req.setBearerName("Con chị A");
        req.setApprovedBy(9);

        exchangeOrderService.processExchangeOrder(req, 100);

        ArgumentCaptor<ReturnOrder> captor = ArgumentCaptor.forClass(ReturnOrder.class);
        verify(returnOrderRepository).save(captor.capture());
        assertThat(captor.getValue().getApprovedBy()).isEqualTo(9);
        assertThat(captor.getValue().getBearerIsOwner()).isFalse();
    }

    @Test
    @DisplayName("Exchange to a non-owner needs no approval")
    void exchangeToNonOwner_needsNoApproval() {
        stubCommon(owner("0912000000"));

        CreateExchangeOrderRequest req = request(
                List.of(returnLine(ResolutionType.EXCHANGE_EVEN, "x1")),
                List.of(exchangeLine("x1", "10000")));
        req.setBearerPhone("0987654321");
        req.setBearerName("Con chị A");

        exchangeOrderService.processExchangeOrder(req, 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("A walk-in sale has no owner to differ from, so no approval is demanded")
    void walkInSale_needsNoApproval() {
        stubCommon(null);

        CreateExchangeOrderRequest req = request(
                List.of(returnLine(ResolutionType.REFUND, null)), List.of());
        req.setBearerName("Người lạ");
        req.setBearerPhone("0987654321");

        exchangeOrderService.processExchangeOrder(req, 100);

        verify(returnOrderRepository).save(any(ReturnOrder.class));
    }

    @Test
    @DisplayName("The return links to the original invoice, so its code is reachable")
    void returnOrder_linksOriginalInvoice() {
        stubCommon(null);

        exchangeOrderService.processExchangeOrder(
                request(List.of(returnLine(ResolutionType.REFUND, null)), List.of()), 100);

        // Không có bản sao mã trong return_orders — mã gốc đọc qua liên kết này.
        ArgumentCaptor<ReturnOrder> captor = ArgumentCaptor.forClass(ReturnOrder.class);
        verify(returnOrderRepository).save(captor.capture());
        assertThat(captor.getValue().getSalesOrder().getOrderCode())
                .isEqualTo("HD-01-260803-0007");
    }
}
