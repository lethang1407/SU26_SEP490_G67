package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesOrderService {

    SalesOrderRepository salesOrderRepository;
    ProductRepository productRepository;
    StockBatchRepository stockBatchRepository;
    CustomerRepository customerRepository;

    /**
     * Create a standard or debt sales order.
     *
     * @param request   order payload
     * @param isDebt    true → debt invoice (customer may or may not be present)
     * @param createdBy ID of the authenticated staff member
     */
    @Transactional
    public SalesOrderResponse createOrder(CreateSalesOrderRequest request,
                                          boolean isDebt,
                                          Integer createdBy) {
        //Resolve customer (optional)
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        }

        //Build order header
        SalesOrder order = new SalesOrder();
        order.setCustomer(customer);
        order.setOrderCode("SO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setPaymentMethod(request.getPaymentMethod());
        order.setOrderStatus("COMPLETED");
        order.setIsDebt(isDebt);
        order.setNote(request.getNote());
        order.setCreatedBy(createdBy);
        order.setUpdatedBy(createdBy);
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());

        BigDecimal discount = request.getDiscountAmount() != null
                ? request.getDiscountAmount() : BigDecimal.ZERO;
        order.setDiscountAmount(discount);

        //3. Build line items
        List<SalesOrderDetail> details = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CreateSalesOrderRequest.OrderItemRequest item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm với mã: " + item.getProductId()));

            StockBatch batch = stockBatchRepository.findById(item.getBatchId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy lô hàng ID: " + item.getBatchId()));

            // Deduct stock
            if (batch.getQuantityIn() < item.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Lô hàng " + batch.getId() + " không đủ tồn kho");
            }
            batch.setQuantityIn(batch.getQuantityIn() - item.getQuantity());
            stockBatchRepository.save(batch);

            BigDecimal lineDiscount = item.getDiscountAmount() != null
                    ? item.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal lineTotal = item.getUnitPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()))
                    .subtract(lineDiscount);

            SalesOrderDetail detail = new SalesOrderDetail();
            detail.setSalesOrder(order);
            detail.setProduct(product);
            detail.setQuantity(item.getQuantity());
            detail.setUnitPrice(item.getUnitPrice());
            detail.setDiscountAmount(lineDiscount);
            detail.setLineTotal(lineTotal);
            detail.setCreatedBy(createdBy);
            detail.setUpdatedBy(createdBy);
            detail.setCreatedAt(Instant.now());
            detail.setUpdatedAt(Instant.now());

            details.add(detail);
            subtotal = subtotal.add(lineTotal);
        }

        order.setSubtotal(subtotal);
        order.setTotalAmount(subtotal.subtract(discount));
        order.setSalesOrderDetails(new java.util.LinkedHashSet<>(details));

        SalesOrder saved = salesOrderRepository.save(order);

        //4. Map to response
        return toResponse(saved, details, request);
    }

    /**
     * Fetch the receipt for a completed order (same DTO, used as receipt).
     */
    @Transactional(readOnly = true)
    public SalesOrderResponse getReceipt(Integer orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        List<SalesOrderDetail> details = new ArrayList<>(order.getSalesOrderDetails());

        List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos = details.stream()
                .map(d -> SalesOrderResponse.SalesOrderDetailInfo.builder()
                        .productId(d.getProduct().getId())
                        .name(d.getProduct().getName())
                        .batchCode("—")    // batch not directly on detail entity; extend if needed
                        .quantity(d.getQuantity())
                        .unitPrice(d.getUnitPrice())
                        .lineTotal(d.getLineTotal())
                        .build())
                .toList();

        SalesOrderResponse.CustomerInfo customerInfo = null;
        if (order.getCustomer() != null) {
            customerInfo = SalesOrderResponse.CustomerInfo.builder()
                    .id(order.getCustomer().getId())
                    .fullName(order.getCustomer().getFullName())
                    .phoneNumber(order.getCustomer().getPhoneNumber())
                    .build();
        }

        return SalesOrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .paymentMethod(order.getPaymentMethod())
                .orderStatus(order.getOrderStatus())
                .isDebt(order.getIsDebt())
                .subtotal(order.getSubtotal())
                .discountAmount(order.getDiscountAmount())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .customer(customerInfo)
                .items(itemInfos)
                .build();
    }

    //Private helpers
    private SalesOrderResponse toResponse(SalesOrder saved,
                                          List<SalesOrderDetail> details,
                                          CreateSalesOrderRequest request) {
        List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos = details.stream()
                .map(d -> SalesOrderResponse.SalesOrderDetailInfo.builder()
                        .productId(d.getProduct().getId())
                        .name(d.getProduct().getName())
                        .batchCode("BATCH-" + request.getItems().stream()
                                .filter(i -> i.getProductId().equals(d.getProduct().getId()))
                                .findFirst().map(i -> String.valueOf(i.getBatchId())).orElse("?"))
                        .quantity(d.getQuantity())
                        .unitPrice(d.getUnitPrice())
                        .lineTotal(d.getLineTotal())
                        .build())
                .toList();

        SalesOrderResponse.CustomerInfo customerInfo = null;
        if (saved.getCustomer() != null) {
            customerInfo = SalesOrderResponse.CustomerInfo.builder()
                    .id(saved.getCustomer().getId())
                    .fullName(saved.getCustomer().getFullName())
                    .phoneNumber(saved.getCustomer().getPhoneNumber())
                    .build();
        }

        return SalesOrderResponse.builder()
                .id(saved.getId())
                .orderCode(saved.getOrderCode())
                .paymentMethod(saved.getPaymentMethod())
                .orderStatus(saved.getOrderStatus())
                .isDebt(saved.getIsDebt())
                .subtotal(saved.getSubtotal())
                .discountAmount(saved.getDiscountAmount())
                .totalAmount(saved.getTotalAmount())
                .createdAt(saved.getCreatedAt())
                .customer(customerInfo)
                .items(itemInfos)
                .build();
    }
}
