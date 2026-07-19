package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateExchangeOrderRequest;
import project.be_sep490_g67.dto.response.ExchangeOrderDetailResponse;
import project.be_sep490_g67.dto.response.ExchangeOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ExchangeOrderService {

    SalesOrderRepository salesOrderRepository;
    SalesOrderDetailRepository salesOrderDetailRepository;
    ReturnOrderRepository returnOrderRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    ProductRepository productRepository;
    StockBatchRepository stockBatchRepository;
    StockMovementRepository stockMovementRepository;
    ProductUnitRepository productUnitRepository;

    /**
     * Get original order details for exchange order page
     */
    @Transactional(readOnly = true)
    public ExchangeOrderDetailResponse getOrderForExchange(Integer orderId) {
        SalesOrder order = salesOrderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        // Check if order already has a return/exchange
        Optional<ReturnOrder> existingReturn = returnOrderRepository.findBySalesOrderId(orderId);
        if (existingReturn.isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, 
                    "Đơn hàng này đã được đổi trả trước đó");
        }

        ExchangeOrderDetailResponse.CustomerInfo customerInfo = null;
        if (order.getCustomer() != null) {
            customerInfo = ExchangeOrderDetailResponse.CustomerInfo.builder()
                    .id(order.getCustomer().getId())
                    .fullName(order.getCustomer().getFullName())
                    .phoneNumber(order.getCustomer().getPhoneNumber())
                    .build();
        }

        List<ExchangeOrderDetailResponse.OrderItemInfo> items = order.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .map(detail -> {
                    Product product = detail.getProduct();
                    return ExchangeOrderDetailResponse.OrderItemInfo.builder()
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode() : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName(detail.getUnitName())
                            .quantityPurchased(detail.getQuantity())
                            .unitPrice(detail.getUnitPrice())
                            .lineTotal(detail.getLineTotal())
                            .build();
                })
                .collect(Collectors.toList());

        return ExchangeOrderDetailResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod())
                .orderStatus(order.getOrderStatus())
                .createdAt(order.getCreatedAt())
                .customer(customerInfo)
                .items(items)
                .build();
    }

    /**
     * Process exchange order - handle returns and new purchases
     */
    @Transactional
    public ExchangeOrderResponse processExchangeOrder(
            CreateExchangeOrderRequest request, 
            Integer staffId) {
        
        // 1. Validate original order exists
        SalesOrder originalOrder = salesOrderRepository.findByIdWithDetails(request.getOriginalOrderId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng gốc"));

        // 2. Check if order already has a return/exchange
        Optional<ReturnOrder> existingReturn = returnOrderRepository.findBySalesOrderId(request.getOriginalOrderId());
        if (existingReturn.isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, 
                    "Đơn hàng này đã được đổi trả trước đó");
        }

        // 3. Validate return items against original order
        validateReturnItems(request.getReturnItems(), originalOrder);

        // 4. Create ReturnOrder
        ReturnOrder returnOrder = new ReturnOrder();
        returnOrder.setSalesOrder(originalOrder);
        returnOrder.setReturnCode("RT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        returnOrder.setReturnReason(request.getReturnNote());
        returnOrder.setResolutionType("EXCHANGE"); // Can be EXCHANGE or REFUND
        returnOrder.setNote(request.getReturnNote());
        returnOrder.setCreatedBy(staffId);
        returnOrder.setUpdatedBy(staffId);
        returnOrder.setCreatedAt(Instant.now());
        returnOrder.setUpdatedAt(Instant.now());
        returnOrder.setIsRemoved(false);

        // 5. Calculate return amounts
        BigDecimal returnSubtotal = BigDecimal.ZERO;
        List<ReturnOrderDetail> returnDetails = new ArrayList<>();

        for (CreateExchangeOrderRequest.ReturnItemRequest returnItem : request.getReturnItems()) {
            Product product = productRepository.findById(returnItem.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, 
                            "Không tìm thấy sản phẩm ID: " + returnItem.getProductId()));

            BigDecimal lineRefund = returnItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(returnItem.getQuantity()));

            ReturnOrderDetail detail = new ReturnOrderDetail();
            detail.setReturnOrder(returnOrder);
            detail.setProduct(product);
            detail.setQuantity(returnItem.getQuantity());
            detail.setUnitPrice(returnItem.getUnitPrice());
            detail.setLineRefund(lineRefund);
            detail.setCreatedBy(staffId);
            detail.setUpdatedBy(staffId);
            detail.setCreatedAt(Instant.now());
            detail.setUpdatedAt(Instant.now());
            detail.setIsRemoved(false);

            returnDetails.add(detail);
            returnSubtotal = returnSubtotal.add(lineRefund);

            // Add stock back for returned items
            addStockBack(product.getId(), returnItem.getQuantity(), returnOrder.getId(), staffId);
        }

        BigDecimal returnDiscount = request.getReturnDiscount() != null 
                ? request.getReturnDiscount() : BigDecimal.ZERO;
        BigDecimal totalReturnAmount = returnSubtotal.subtract(returnDiscount);
        returnOrder.setRefundAmount(totalReturnAmount);

        // 6. Save return order first to get ID
        ReturnOrder savedReturnOrder = returnOrderRepository.save(returnOrder);
        returnDetails.forEach(d -> d.setReturnOrder(savedReturnOrder));
        returnOrderDetailRepository.saveAll(returnDetails);

        // 7. Process exchange items (new products purchased)
        BigDecimal exchangeSubtotal = BigDecimal.ZERO;
        List<SalesOrderDetail> exchangeDetails = new ArrayList<>();

        if (request.getExchangeItems() != null && !request.getExchangeItems().isEmpty()) {
            for (CreateExchangeOrderRequest.ExchangeItemRequest exchangeItem : request.getExchangeItems()) {
                Product product = productRepository.findById(exchangeItem.getProductId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy sản phẩm ID: " + exchangeItem.getProductId()));

                // Resolve batch
                Integer resolvedBatchId = exchangeItem.getBatchId();
                StockBatch batch;

                if (resolvedBatchId == null || resolvedBatchId <= 0) {
                    batch = stockBatchRepository
                            .findFirstAvailableBatchByProductId(exchangeItem.getProductId())
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST,
                                    "Không tìm thấy lô hàng khả dụng cho sản phẩm: " + product.getName()));
                    resolvedBatchId = batch.getId();
                } else {
                    batch = stockBatchRepository.findById(resolvedBatchId)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Không tìm thấy lô hàng"));
                }

                // Check stock availability
                int currentStock = stockMovementRepository
                        .sumQuantityDeltaByBatchId(resolvedBatchId);
                if (currentStock < exchangeItem.getQuantity()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Sản phẩm " + product.getName() +
                                    " không đủ tồn kho. Còn lại: " + currentStock);
                }

                // Deduct stock
                StockMovement movement = new StockMovement();
                movement.setStockBatch(batch);
                movement.setMovementType("SALE");
                movement.setReferenceType("EXCHANGE_ORDER");
                movement.setReferenceId(savedReturnOrder.getId());
                movement.setQuantityDelta(-exchangeItem.getQuantity());
                movement.setStockAfter(currentStock - exchangeItem.getQuantity());
                movement.setCreatedBy(staffId);
                movement.setCreatedAt(Instant.now());
                stockMovementRepository.save(movement);

                // Resolve unit
                ProductUnit resolvedUnit = null;
                String resolvedUnitName = null;

                if (exchangeItem.getProductUnitId() != null) {
                    resolvedUnit = productUnitRepository.findById(exchangeItem.getProductUnitId())
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Không tìm thấy đơn vị sản phẩm ID: " + exchangeItem.getProductUnitId()));
                    resolvedUnitName = resolvedUnit.getName();
                } else {
                    resolvedUnitName = product.getProductUnits().stream()
                            .filter(u -> u.getUnitBase() != null
                                    && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                            .findFirst()
                            .map(ProductUnit::getName)
                            .orElse(null);
                }

                BigDecimal lineDiscount = exchangeItem.getDiscountAmount() != null
                        ? exchangeItem.getDiscountAmount() : BigDecimal.ZERO;
                BigDecimal lineTotal = exchangeItem.getUnitPrice()
                        .multiply(BigDecimal.valueOf(exchangeItem.getQuantity()))
                        .subtract(lineDiscount);

                SalesOrderDetail detail = new SalesOrderDetail();
                detail.setSalesOrder(originalOrder);
                detail.setProduct(product);
                detail.setProductUnit(resolvedUnit);
                detail.setUnitName(resolvedUnitName);
                detail.setQuantity(exchangeItem.getQuantity());
                detail.setUnitPrice(exchangeItem.getUnitPrice());
                detail.setDiscountAmount(lineDiscount);
                detail.setLineTotal(lineTotal);
                detail.setCreatedBy(staffId);
                detail.setUpdatedBy(staffId);
                detail.setCreatedAt(Instant.now());
                detail.setUpdatedAt(Instant.now());
                detail.setIsRemoved(false);

                exchangeDetails.add(detail);
                exchangeSubtotal = exchangeSubtotal.add(lineTotal);
            }

            // Save exchange order details
            salesOrderDetailRepository.saveAll(exchangeDetails);
        }

        BigDecimal exchangeDiscount = request.getExchangeDiscount() != null 
                ? request.getExchangeDiscount() : BigDecimal.ZERO;
        BigDecimal totalExchangeAmount = exchangeSubtotal.subtract(exchangeDiscount);

        // Calculate net amount (positive = refund to customer, negative = customer pays)
        BigDecimal netAmount = totalReturnAmount.subtract(totalExchangeAmount);

        originalOrder.setOrderStatus("TRẢ HÀNG");
        originalOrder.setUpdatedBy(staffId);
        originalOrder.setUpdatedAt(Instant.now());
        salesOrderRepository.save(originalOrder);

        return buildExchangeOrderResponse(
                savedReturnOrder,
                originalOrder,
                returnDetails,
                exchangeDetails,
                returnSubtotal,
                returnDiscount,
                totalReturnAmount,
                exchangeSubtotal,
                exchangeDiscount,
                totalExchangeAmount,
                netAmount,
                request.getRefundMethod()
        );
    }

    /**
     * Validate return items against original order
     */
    private void validateReturnItems(
            List<CreateExchangeOrderRequest.ReturnItemRequest> returnItems,
            SalesOrder originalOrder) {
        
        Map<Integer, Integer> purchasedQuantities = originalOrder.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .collect(Collectors.toMap(
                        detail -> detail.getProduct().getId(),
                        SalesOrderDetail::getQuantity,
                        Integer::sum
                ));

        for (CreateExchangeOrderRequest.ReturnItemRequest returnItem : returnItems) {
            Integer purchasedQty = purchasedQuantities.get(returnItem.getProductId());
            
            if (purchasedQty == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Sản phẩm ID " + returnItem.getProductId() + " không có trong đơn hàng gốc");
            }

            if (returnItem.getQuantity() > purchasedQty) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Số lượng trả (" + returnItem.getQuantity() + 
                        ") vượt quá số lượng đã mua (" + purchasedQty + ")");
            }
        }
    }

    /**
     * Add stock back when items are returned
     */
    private void addStockBack(Integer productId, Integer quantity, Integer returnOrderId, Integer staffId) {
        // Find the most recent batch for this product
        StockBatch batch = stockBatchRepository
                .findFirstAvailableBatchByProductId(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Không tìm thấy lô hàng cho sản phẩm ID: " + productId));

        int currentStock = stockMovementRepository.sumQuantityDeltaByBatchId(batch.getId());

        StockMovement movement = new StockMovement();
        movement.setStockBatch(batch);
        movement.setMovementType("RETURN");
        movement.setReferenceType("RETURN_ORDER");
        movement.setReferenceId(returnOrderId);
        movement.setQuantityDelta(quantity); // Positive for return
        movement.setStockAfter(currentStock + quantity);
        movement.setCreatedBy(staffId);
        movement.setCreatedAt(Instant.now());
        stockMovementRepository.save(movement);
    }

    /**
     * Build exchange order response
     */
    private ExchangeOrderResponse buildExchangeOrderResponse(
            ReturnOrder returnOrder,
            SalesOrder originalOrder,
            List<ReturnOrderDetail> returnDetails,
            List<SalesOrderDetail> exchangeDetails,
            BigDecimal returnSubtotal,
            BigDecimal returnDiscount,
            BigDecimal totalReturnAmount,
            BigDecimal exchangeSubtotal,
            BigDecimal exchangeDiscount,
            BigDecimal totalExchangeAmount,
            BigDecimal netAmount,
            String refundMethod) {

        List<ExchangeOrderResponse.ReturnItemInfo> returnItems = returnDetails.stream()
                .map(detail -> {
                    Product product = detail.getProduct();
                    return ExchangeOrderResponse.ReturnItemInfo.builder()
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode() : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName("—") // Unit name from return request
                            .quantity(detail.getQuantity())
                            .unitPrice(detail.getUnitPrice())
                            .lineTotal(detail.getLineRefund())
                            .build();
                })
                .collect(Collectors.toList());

        List<ExchangeOrderResponse.ExchangeItemInfo> exchangeItems = exchangeDetails.stream()
                .map(detail -> {
                    Product product = detail.getProduct();
                    return ExchangeOrderResponse.ExchangeItemInfo.builder()
                            .productId(product.getId())
                            .productCode(product.getBarcode() != null ? product.getBarcode() : "SP" + String.format("%06d", product.getId()))
                            .productName(product.getName())
                            .unitName(detail.getUnitName())
                            .quantity(detail.getQuantity())
                            .unitPrice(detail.getUnitPrice())
                            .discountAmount(detail.getDiscountAmount())
                            .lineTotal(detail.getLineTotal())
                            .build();
                })
                .collect(Collectors.toList());

        return ExchangeOrderResponse.builder()
                .returnOrderId(returnOrder.getId())
                .returnCode(returnOrder.getReturnCode())
                .originalOrderId(originalOrder.getId())
                .originalOrderCode(originalOrder.getOrderCode())
                .originalTotalAmount(originalOrder.getTotalAmount())
                .returnSubtotal(returnSubtotal)
                .returnDiscount(returnDiscount)
                .totalReturnAmount(totalReturnAmount)
                .exchangeSubtotal(exchangeSubtotal)
                .exchangeDiscount(exchangeDiscount)
                .totalExchangeAmount(totalExchangeAmount)
                .netAmount(netAmount)
                .refundMethod(refundMethod)
                .returnNote(returnOrder.getReturnReason())
                .createdAt(returnOrder.getCreatedAt())
                .returnItems(returnItems)
                .exchangeItems(exchangeItems)
                .build();
    }
}
