package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.SalesOrderListResponse;
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
    SalesOrderDetailRepository salesOrderDetailRepository;
    ProductRepository productRepository;
    CustomerRepository customerRepository;
    ProductUnitRepository productUnitRepository;
    StockDeductionService stockDeductionService;

    @Transactional
    public SalesOrderResponse createOrder(CreateSalesOrderRequest request,
                                          boolean isDebt,
                                          Integer createdBy) {
        // Resolve customer (optional)
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        }

        // Create sale order
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

        //Save order
        order.setSubtotal(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        order.setPaidAmount(BigDecimal.ZERO);
        SalesOrder saved = salesOrderRepository.save(order);

        // Build line items, using FEFO to minus products
        List<SalesOrderDetail> details = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CreateSalesOrderRequest.OrderItemRequest item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy sản phẩm với mã: " + item.getProductId()));

            stockDeductionService.deductStock(
                    item.getProductId(),
                    item.getQuantity(),
                    saved.getId(),
                    createdBy
            );

            //Resolve unit
            ProductUnit resolvedUnit = null;
            String resolvedUnitName = null;

            if (item.getProductUnitId() != null) {
                resolvedUnit = productUnitRepository.findById(item.getProductUnitId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy đơn vị sản phẩm ID: "
                                        + item.getProductUnitId()));
                resolvedUnitName = resolvedUnit.getName();
            } else {
                resolvedUnitName = product.getProductUnits().stream()
                        .filter(u -> u.getUnitBase() != null
                                && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                        .findFirst()
                        .map(ProductUnit::getName)
                        .orElse(null);
            }

            // Calculate total
            BigDecimal lineDiscount = item.getDiscountAmount() != null
                    ? item.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal lineTotal = item.getUnitPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()))
                    .subtract(lineDiscount);

            SalesOrderDetail detail = new SalesOrderDetail();
            detail.setSalesOrder(saved);
            detail.setProduct(product);
            detail.setProductUnit(resolvedUnit);
            detail.setUnitName(resolvedUnitName);
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
        order.setPaidAmount(isDebt ? BigDecimal.ZERO : subtotal.subtract(discount));
        salesOrderRepository.save(order);

        salesOrderDetailRepository.saveAll(details);
        return toResponse(saved, details);
    }

    @Transactional(readOnly = true)
    public SalesOrderResponse getReceipt(Integer orderId) {
        SalesOrder order = salesOrderRepository.findActiveById(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"));

        List<SalesOrderDetail> details = new ArrayList<>(order.getSalesOrderDetails());

        List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos = details.stream()
                .map(d -> SalesOrderResponse.SalesOrderDetailInfo.builder()
                        .productId(d.getProduct().getId())
                        .name(d.getProduct().getName())
                        .unitName(d.getUnitName())
                        .quantity(d.getQuantity())
                        .unitPrice(d.getUnitPrice())
                        .discountAmount(d.getDiscountAmount())
                        .lineTotal(d.getLineTotal())
                        .build())
                .toList();

        return getSalesOrderResponse(order, itemInfos);
    }

    private SalesOrderResponse getSalesOrderResponse(SalesOrder order, List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos) {
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
                .paidAmount(order.getPaidAmount())
                .createdAt(order.getCreatedAt())
                .customer(customerInfo)
                .items(itemInfos)
                .build();
    }

    // ---- Private helpers ----
    // No batch info here on purpose: FEFO can split one line across several
    // batches, so a single batch code cannot describe it. The full allocation is
    // recorded in stock_movements (reference_type = SALES_ORDER) and belongs on
    // the order-detail view as a list, not on the create response.
    private SalesOrderResponse toResponse(SalesOrder saved,
                                          List<SalesOrderDetail> details) {
        List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos = details.stream()
                .map(d -> SalesOrderResponse.SalesOrderDetailInfo.builder()
                        .productId(d.getProduct().getId())
                        .name(d.getProduct().getName())
                        .unitName(d.getUnitName())
                        .quantity(d.getQuantity())
                        .unitPrice(d.getUnitPrice())
                        .discountAmount(d.getDiscountAmount())
                        .lineTotal(d.getLineTotal())
                        .build())
                .toList();

        return getSalesOrderResponse(saved, itemInfos);
    }

    @Transactional(readOnly = true)
    public SalesOrderListResponse getOrderHistory(
            Integer createdByFilter,
            String search,
            Instant dateFrom,
            Instant dateTo,
            int page,
            int size
    ) {
        int safeSize = Math.min(size, 50);
        String likeSearch = (search == null || search.isBlank())
                ? null
                : "%" + search.toLowerCase() + "%";

        Page<SalesOrder> pg = salesOrderRepository.findHistory(
                createdByFilter, likeSearch, dateFrom, dateTo,
                PageRequest.of(page, safeSize)
        );

        List<SalesOrderListResponse.Item> items = pg.getContent().stream()
                .map(o -> SalesOrderListResponse.Item.builder()
                        .id(o.getId())
                        .orderCode(o.getOrderCode())
                        .createdAt(o.getCreatedAt())
                        .customerName(o.getCustomer() != null ? o.getCustomer().getFullName() : null)
                        .totalAmount(o.getTotalAmount())
                        .orderStatus(o.getOrderStatus())
                        .paymentMethod(o.getPaymentMethod())
                        .build())
                .toList();

        return SalesOrderListResponse.builder()
                .content(items)
                .page(pg.getNumber())
                .size(pg.getSize())
                .totalElements(pg.getTotalElements())
                .totalPages(pg.getTotalPages())
                .build();
    }
}
