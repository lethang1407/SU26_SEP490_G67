package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.SalesOrderDetailResponse;
import project.be_sep490_g67.dto.response.SalesOrderListResponse;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.enums.NotificationReferenceType;
import project.be_sep490_g67.enums.NotificationType;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;
import project.be_sep490_g67.utils.DebtCalculator;
import project.be_sep490_g67.utils.UnitPriceResolver;
import project.be_sep490_g67.utils.UnitQuantityConverter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesOrderService {

        DocumentCodeService documentCodeService;
        StockBatchRepository stockBatchRepository;
        SalesOrderRepository salesOrderRepository;
        SalesOrderDetailRepository salesOrderDetailRepository;
        ProductRepository productRepository;
        CustomerRepository customerRepository;
        ProductUnitRepository productUnitRepository;
        StockDeductionService stockDeductionService;
        DebtPaymentRepository debtPaymentRepository;
        ReturnOrderRepository returnOrderRepository;
        ReturnOrderDetailRepository returnOrderDetailRepository;
        UserRepository userRepository;
        DebtPolicy debtPolicy;
        NotificationService notificationService;

        @Transactional
        public SalesOrderResponse createOrder(CreateSalesOrderRequest request,
                        boolean isDebt,
                        Integer createdBy) {
                // Resolve customer (optional với đơn thường, bắt buộc với đơn nợ)
                Customer customer = null;
                if (request.getCustomerId() != null) {
                        customer = customerRepository.findById(request.getCustomerId())
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
                }

                Instant now = Instant.now();
                // Phải tính trước khi lưu đơn hiện tại, nếu không đơn này tự làm
                // cho chính nó thành "khách đã từng nợ".
                boolean needsReview = false;
                if (isDebt) {
                        debtPolicy.validateDebtSale(customer, request.getDueDate(), now);
                        needsReview = isDebtOrderUnstable(customer.getId(), createdBy);
                }

                // Create sale order
                SalesOrder order = new SalesOrder();
                order.setCustomer(customer);
                order.setOrderCode(documentCodeService.generate(DocumentType.SALE_INVOICE));
                order.setPaymentMethod(request.getPaymentMethod());
                order.setOrderStatus("COMPLETED");
                order.setIsDebt(isDebt);
                if (isDebt) {
                        order.setDueDate(request.getDueDate());
                }
                order.setNote(request.getNote());
                order.setCreatedBy(createdBy);
                order.setUpdatedBy(createdBy);
                order.setCreatedAt(Instant.now());
                order.setUpdatedAt(Instant.now());

                BigDecimal discount = request.getDiscountAmount() != null
                                ? request.getDiscountAmount()
                                : BigDecimal.ZERO;
                order.setDiscountAmount(discount);

                // Save order
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

                        // Resolve unit BEFORE deducting stock: stock is tracked in base units
                        ProductUnit resolvedUnit;
                        String resolvedUnitName;

                        if (item.getProductUnitId() != null) {
                                resolvedUnit = productUnitRepository.findById(item.getProductUnitId())
                                                .orElseThrow(() -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Không tìm thấy đơn vị sản phẩm ID: "
                                                                                + item.getProductUnitId()));
                                resolvedUnitName = resolvedUnit.getName();
                        } else {
                                resolvedUnit = product.getProductUnits().stream()
                                                .filter(u -> u.getUnitBase() != null
                                                                && u.getUnitBase().compareTo(BigDecimal.ONE) == 0)
                                                .findFirst()
                                                .orElse(null);
                                resolvedUnitName = resolvedUnit != null ? resolvedUnit.getName() : null;
                        }

                        Integer soldFromBatchId = stockDeductionService.deductStockFromPicks(
                                        item.getProductId(),
                                        UnitQuantityConverter.toBaseUnits(resolvedUnit, item.getQuantity()),
                                        saved.getId(),
                                        createdBy,
                                        resolvePicks(item));

                        BigDecimal unitPrice = UnitPriceResolver.resolve(product, resolvedUnit);

                        BigDecimal lineDiscount = item.getDiscountAmount() != null
                                        ? item.getDiscountAmount()
                                        : BigDecimal.ZERO;
                        BigDecimal lineTotal = unitPrice
                                        .multiply(BigDecimal.valueOf(item.getQuantity()))
                                        .subtract(lineDiscount);

                        SalesOrderDetail detail = new SalesOrderDetail();
                        detail.setSalesOrder(saved);
                        detail.setProduct(product);
                        detail.setProductUnit(resolvedUnit);
                        detail.setUnitName(resolvedUnitName);
                        if (soldFromBatchId != null) {
                                detail.setStockBatch(stockBatchRepository.getReferenceById(soldFromBatchId));
                        }
                        detail.setQuantity(item.getQuantity());
                        detail.setUnitPrice(unitPrice);
                        detail.setDiscountAmount(lineDiscount);
                        detail.setLineTotal(lineTotal);
                        detail.setCreatedBy(createdBy);
                        detail.setUpdatedBy(createdBy);
                        detail.setCreatedAt(Instant.now());
                        detail.setUpdatedAt(Instant.now());

                        details.add(detail);
                        subtotal = subtotal.add(lineTotal);
                }

                BigDecimal grandTotal = subtotal.subtract(discount);
                order.setSubtotal(subtotal);
                order.setTotalAmount(grandTotal);
                // Đơn nợ: paidAmount là phần khách trả trước (0 = nợ toàn bộ).
                // Đơn thường: trả đủ ngay.
                BigDecimal paid = isDebt ? resolvePrepaid(request.getPaidAmount(), grandTotal) : grandTotal;
                order.setPaidAmount(paid);
                salesOrderRepository.save(order);

                if (isDebt) {
                        debtPolicy.addToCustomerDebt(customer, grandTotal.subtract(paid));
                }

                if (isDebt && needsReview) {
                        notifyAdminsAboutNewDebtCustomer(customer, saved, grandTotal.subtract(paid));
                }

                salesOrderDetailRepository.saveAll(details);
                return toResponse(saved, details);
        }

        private List<StockDeductionService.StockPick> resolvePicks(
                        CreateSalesOrderRequest.OrderItemRequest item) {
                if (item.getPicks() != null && !item.getPicks().isEmpty()) {
                        return item.getPicks().stream()
                                        .map(pick -> new StockDeductionService.StockPick(
                                                        pick.getLocationId(), pick.getBatchId()))
                                        .toList();
                }
                List<Integer> locationIds = item.getLocationIds() != null && !item.getLocationIds().isEmpty()
                                ? item.getLocationIds()
                                : (item.getLocationId() != null ? List.of(item.getLocationId()) : null);
                return locationIds == null ? null : locationIds.stream()
                                .map(locationId -> new StockDeductionService.StockPick(locationId, null))
                                .toList();
        }

        /**
         * check đơn nợ
         *
         *Nếu là staff thì cần đối soát admin check khách hàng nợ mới
         */
        private boolean isDebtOrderUnstable(Integer customerId, Integer createdBy) {
                if (hasAdminRole(createdBy)) {
                        return false;
                }
                return !salesOrderRepository.existsDebtOrderByCustomerId(customerId);
        }

        /**
         * Bắn thông báo cho admin khi thu ngân ghi nợ cho một khách hàng nợ mới.
         * Thông báo trỏ về khách hàng để admin mở thẳng form bổ sung hồ sơ.
         */
        private void notifyAdminsAboutNewDebtCustomer(Customer customer,
                        SalesOrder order,
                        BigDecimal debtAmount) {
                String phone = customer.getPhoneNumber() != null && !customer.getPhoneNumber().isBlank()
                                ? customer.getPhoneNumber()
                                : "chưa có SĐT";
                String message = String.format(
                                "%s (%s) vừa được ghi nợ %s đ ở đơn %s. Vui lòng kiểm tra và bổ sung hồ sơ khách hàng.",
                                customer.getFullName(),
                                phone,
                                String.format("%,.0f", debtAmount),
                                order.getOrderCode());

                notificationService.notifyAdmins(
                                NotificationType.DEBT_CUSTOMER_REVIEW,
                                "Khách hàng nợ mới cần rà soát",
                                message,
                                NotificationReferenceType.CUSTOMER,
                                customer.getId());
        }

        private boolean hasAdminRole(Integer userId) {
                if (userId == null) {
                        return false;
                }
                return userRepository.findActiveStaffByIdWithRoles(userId)
                                .map(user -> user.getRoles().stream()
                                                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName())))
                                .orElse(false);
        }

        /** Kẹp số tiền trả trước vào [0, grandTotal). Trả đủ thì không còn là đơn nợ. */
        private BigDecimal resolvePrepaid(BigDecimal requested, BigDecimal grandTotal) {
                if (requested == null) {
                        return BigDecimal.ZERO;
                }
                if (requested.compareTo(BigDecimal.ZERO) < 0
                                || requested.compareTo(grandTotal) >= 0) {
                        throw new AppException(ErrorCode.DEBT_PREPAID_EXCEEDS_TOTAL);
                }
                return requested;
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

        @Transactional(readOnly = true)
        public SalesOrderDetailResponse getOrderDetailWithReturns(Integer orderId) {
                SalesOrder order = salesOrderRepository.findByIdWithDetails(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                Map<Integer, Integer> returnedByLine = returnedQuantityByLine(orderId);
                List<ReturnOrder> returnOrders = returnOrderRepository.findAllBySalesOrderIdWithDetails(orderId);

                SalesOrderDetailResponse.CustomerInfo customerInfo = null;
                if (order.getCustomer() != null) {
                        customerInfo = SalesOrderDetailResponse.CustomerInfo.builder()
                                        .id(order.getCustomer().getId())
                                        .fullName(order.getCustomer().getFullName())
                                        .phoneNumber(order.getCustomer().getPhoneNumber())
                                        .build();
                }

                List<SalesOrderDetailResponse.OrderItemInfo> items = order.getSalesOrderDetails().stream()
                                .filter(detail -> !Boolean.TRUE.equals(detail.getIsRemoved()))
                                .map(detail -> {
                                        Product product = detail.getProduct();
                                        int returnedQuantity = returnedByLine.getOrDefault(detail.getId(), 0);
                                        return SalesOrderDetailResponse.OrderItemInfo.builder()
                                                        .salesOrderDetailId(detail.getId())
                                                        .productId(product.getId())
                                                        .productCode(productCode(product))
                                                        .productName(product.getName())
                                                        .unitName(detail.getUnitName())
                                                        .quantityPurchased(detail.getQuantity())
                                                        .quantityReturned(returnedQuantity)
                                                        .quantityReturnable(detail.getQuantity() - returnedQuantity)
                                                        .productReturnable(product.getIsReturnable() == null
                                                                        || product.getIsReturnable())
                                                        .unitPrice(detail.getUnitPrice())
                                                        .discountAmount(detail.getDiscountAmount())
                                                        .lineTotal(detail.getLineTotal())
                                                        .build();
                                })
                                .toList();

                List<SalesOrderDetailResponse.ReturnOrderInfo> returnInfos = returnOrders.stream()
                                .map(this::toReturnOrderInfo)
                                .toList();

                return SalesOrderDetailResponse.builder()
                                .id(order.getId())
                                .orderCode(order.getOrderCode())
                                .paymentMethod(order.getPaymentMethod())
                                .orderStatus(order.getOrderStatus())
                                .isDebt(order.getIsDebt())
                                .subtotal(order.getSubtotal())
                                .discountAmount(order.getDiscountAmount())
                                .totalAmount(order.getTotalAmount())
                                .paidAmount(order.getPaidAmount())
                                .dueDate(order.getDueDate())
                                .note(order.getNote())
                                .createdAt(order.getCreatedAt())
                                .customer(customerInfo)
                                .items(items)
                                .returnOrders(returnInfos)
                                .build();
        }

        private SalesOrderResponse getSalesOrderResponse(SalesOrder order,
                        List<SalesOrderResponse.SalesOrderDetailInfo> itemInfos) {
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

        private SalesOrderDetailResponse.ReturnOrderInfo toReturnOrderInfo(ReturnOrder returnOrder) {
                List<SalesOrderDetailResponse.ReturnItemInfo> items = returnOrder.getReturnOrderDetails().stream()
                                .filter(detail -> !Boolean.TRUE.equals(detail.getIsRemoved()))
                                .map(detail -> {
                                        Product product = detail.getProduct();
                                        return SalesOrderDetailResponse.ReturnItemInfo.builder()
                                                        .returnOrderDetailId(detail.getId())
                                                        .salesOrderDetailId(detail.getSalesOrderDetail() != null
                                                                        ? detail.getSalesOrderDetail().getId()
                                                                        : null)
                                                        .productId(product.getId())
                                                        .productCode(productCode(product))
                                                        .productName(product.getName())
                                                        .unitName(detail.getUnitName())
                                                        .quantity(detail.getQuantity())
                                                        .unitPrice(detail.getUnitPrice())
                                                        .lineRefund(detail.getLineRefund())
                                                        .resolutionType(detail.getResolutionType())
                                                        .itemCondition(detail.getItemCondition())
                                                        .note(detail.getNote())
                                                        .build();
                                })
                                .toList();

                return SalesOrderDetailResponse.ReturnOrderInfo.builder()
                                .returnOrderId(returnOrder.getId())
                                .returnCode(returnOrder.getReturnCode())
                                .returnReason(returnOrder.getReturnReason())
                                .resolutionType(returnOrder.getResolutionType())
                                .refundAmount(returnOrder.getRefundAmount())
                                .debtOffsetAmount(returnOrder.getDebtOffsetAmount())
                                .cashRefundAmount(returnOrder.getCashRefundAmount())
                                .note(returnOrder.getNote())
                                .createdAt(returnOrder.getCreatedAt())
                                .items(items)
                                .build();
        }

        private Map<Integer, Integer> returnedQuantityByLine(Integer salesOrderId) {
                return returnOrderDetailRepository.sumReturnedQuantityByOrder(salesOrderId).stream()
                                .collect(Collectors.toMap(
                                                row -> (Integer) row[0],
                                                row -> ((Number) row[1]).intValue()));
        }

        private String productCode(Product product) {
                return product.getBarcode() != null
                                ? product.getBarcode()
                                : "SP" + String.format("%06d", product.getId());
        }

        @Transactional(readOnly = true)
        public SalesOrderResponse getOrderDetail(Integer orderId, Integer currentUserId, boolean isPrivileged) {
                SalesOrder order = salesOrderRepository.findActiveById(orderId)
                                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));

                if (!isPrivileged && (order.getCreatedBy() == null || !order.getCreatedBy().equals(currentUserId))) {
                        throw new AppException(ErrorCode.INVOICE_ACCESS_DENIED);
                }

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

        @Transactional(readOnly = true)
        public SalesOrderListResponse getOrderHistory(
                        Integer createdByFilter,
                        String search,
                        String orderCode,
                        String customer,
                        String product,
                        Instant dateFrom,
                        Instant dateTo,
                        String orderStatus,
                        String paymentMethod,
                        Boolean isDebt,
                        int page,
                        int size) {
                int safeSize = Math.min(size, 50);

                Page<SalesOrder> pg = salesOrderRepository.findHistory(
                                createdByFilter,
                                toLikePattern(search),
                                toLikePattern(orderCode),
                                toLikePattern(customer),
                                toLikePattern(product),
                                dateFrom, dateTo,
                                toExactFilter(orderStatus),
                                toExactFilter(paymentMethod),
                                isDebt,
                                PageRequest.of(page, safeSize));

                List<Integer> orderIds = pg.getContent().stream()
                                .map(SalesOrder::getId)
                                .toList();

                // Chứng từ đổi/trả của từng hóa đơn trong trang. Đơn đổi không còn là
                // dòng riêng trong lịch sử (findHistory đã lọc originalSalesOrderId),
                // nên toàn bộ vết đổi/trả phải quy về dòng hóa đơn gốc.
                Map<Integer, List<SalesOrderListResponse.RelatedDocument>> relatedByOrderId = orderIds.isEmpty()
                                ? Map.of()
                                : collectRelatedDocuments(orderIds);

                // Tổng đã trả nợ
                Map<Integer, BigDecimal> debtPaidByOrderId = orderIds.isEmpty()
                                ? Map.of()
                                : debtPaymentRepository.sumPaidBySalesOrderIds(orderIds).stream()
                                                .collect(Collectors.toMap(
                                                                row -> (Integer) row[0],
                                                                row -> (BigDecimal) row[1]));

                Instant now = Instant.now();

                List<SalesOrderListResponse.Item> items = pg.getContent().stream()
                                .map(o -> toHistoryItem(
                                                o,
                                                relatedByOrderId.getOrDefault(o.getId(), List.of()),
                                                debtPaidByOrderId.getOrDefault(o.getId(), BigDecimal.ZERO),
                                                now))
                                .toList();

                return SalesOrderListResponse.builder()
                                .content(items)
                                .page(pg.getNumber())
                                .size(pg.getSize())
                                .totalElements(pg.getTotalElements())
                                .totalPages(pg.getTotalPages())
                                .build();
        }

        /**
         * Một dòng lịch sử hóa đơn. Thông tin công nợ chỉ được tính cho hóa đơn
         * bán nợ; đơn trả tiền ngay để null để FE không hiện badge nợ.
         */
        /**
         * Gom phiếu trả (ReturnOrder) và đơn đổi (SalesOrder có originalSalesOrderId)
         * của cả trang về theo hóa đơn gốc, trong hai query thay vì N+1.
         */
        private Map<Integer, List<SalesOrderListResponse.RelatedDocument>> collectRelatedDocuments(
                        List<Integer> orderIds) {
                Map<Integer, List<SalesOrderListResponse.RelatedDocument>> byOrderId = new HashMap<>();

                for (ReturnOrder r : returnOrderRepository.findAllBySalesOrderIds(orderIds)) {
                        byOrderId.computeIfAbsent(r.getSalesOrder().getId(), k -> new ArrayList<>())
                                        .add(SalesOrderListResponse.RelatedDocument.builder()
                                                        .id(r.getId())
                                                        .code(r.getReturnCode())
                                                        .type("RETURN")
                                                        .createdAt(r.getCreatedAt())
                                                        .amount(r.getRefundAmount())
                                                        .build());
                }

                for (SalesOrder e : salesOrderRepository.findByOriginalSalesOrderIds(orderIds)) {
                        byOrderId.computeIfAbsent(e.getOriginalSalesOrderId(), k -> new ArrayList<>())
                                        .add(SalesOrderListResponse.RelatedDocument.builder()
                                                        .id(e.getId())
                                                        .code(e.getOrderCode())
                                                        .type("EXCHANGE")
                                                        .createdAt(e.getCreatedAt())
                                                        .amount(e.getTotalAmount())
                                                        .build());
                }

                return byOrderId;
        }

        private SalesOrderListResponse.Item toHistoryItem(SalesOrder o,
                        List<SalesOrderListResponse.RelatedDocument> relatedDocuments,
                        BigDecimal debtPaid,
                        Instant now) {
                boolean isDebt = Boolean.TRUE.equals(o.getIsDebt());
                BigDecimal remainingDebt = isDebt
                                ? DebtCalculator.remaining(o.getTotalAmount(), o.getPaidAmount(), debtPaid)
                                : null;

                return SalesOrderListResponse.Item.builder()
                                .id(o.getId())
                                .orderCode(o.getOrderCode())
                                .relatedDocuments(relatedDocuments)
                                .createdAt(o.getCreatedAt())
                                .customerName(o.getCustomer() != null ? o.getCustomer().getFullName() : null)
                                .customerPhone(o.getCustomer() != null ? o.getCustomer().getPhoneNumber() : null)
                                .totalAmount(o.getTotalAmount())
                                .orderStatus(o.getOrderStatus())
                                .paymentMethod(o.getPaymentMethod())
                                .isDebt(isDebt)
                                .isCheckDebtUnstable(isDebt ? isCustomerDebtUnstable(o.getCustomer()) : null)
                                .dueDate(isDebt ? o.getDueDate() : null)
                                .remainingDebt(remainingDebt)
                                .debtStatus(isDebt
                                                ? DebtCalculator.deriveStatus(remainingDebt, o.getDueDate(), now).name()
                                                : null)
                                .build();
        }

        /**
         * Khách bị xóa hoặc đơn nợ dữ liệu cũ không có khách
         * thì coi như không cần rà soát — không có ai để rà.
         */
        private boolean isCustomerDebtUnstable(Customer customer) {
                return customer != null && Boolean.TRUE.equals(customer.getIsCheckUnstableDebt());
        }

        private String toExactFilter(String value) {
                return (value == null || value.isBlank()) ? null : value.trim();
        }

        private String toLikePattern(String keyword) {
                return (keyword == null || keyword.isBlank())
                                ? null
                                : "%" + keyword.trim().toLowerCase() + "%";
        }
}
