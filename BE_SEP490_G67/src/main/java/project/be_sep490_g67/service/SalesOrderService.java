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
import project.be_sep490_g67.dto.response.SalesOrderListResponse;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.entity.*;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;
import project.be_sep490_g67.utils.DebtCalculator;
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
        UserRepository userRepository;
        DebtPolicy debtPolicy;

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

                        // Calculate total
                        BigDecimal lineDiscount = item.getDiscountAmount() != null
                                        ? item.getDiscountAmount()
                                        : BigDecimal.ZERO;
                        BigDecimal lineTotal = item.getUnitPrice()
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

                BigDecimal grandTotal = subtotal.subtract(discount);
                order.setSubtotal(subtotal);
                order.setTotalAmount(grandTotal);
                // Đơn nợ: paidAmount là phần khách trả trước (0 = nợ toàn bộ).
                // Đơn thường: trả đủ ngay.
                BigDecimal paid = isDebt ? resolvePrepaid(request.getPaidAmount(), grandTotal) : grandTotal;
                order.setPaidAmount(paid);
                salesOrderRepository.save(order);

                if (isDebt) {
                        // Cờ "cần rà soát" nằm trên KHÁCH chứ không trên đơn: nó nói về
                        // quan hệ nợ của khách này. Chỉ dựng, không bao giờ hạ — đơn nợ
                        // sau do quản lý lập không xoá được việc rà soát còn treo từ đơn
                        // đầu. Đặt ngay trước addToCustomerDebt để khách chỉ lưu một lần.
                        if (needsReview) {
                                customer.setIsCheckUnstableDebt(true);
                        }
                        debtPolicy.addToCustomerDebt(customer, grandTotal.subtract(paid));
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
                                PageRequest.of(page, safeSize));

                List<Integer> orderIds = pg.getContent().stream()
                                .map(SalesOrder::getId)
                                .toList();

                // Mã phiếu trả mới nhất của từng hóa đơn trong trang
                Map<Integer, String> returnCodeByOrderId = orderIds.isEmpty()
                                ? Map.of()
                                : returnOrderRepository.findAllBySalesOrderIds(orderIds).stream()
                                                .filter(r -> r.getReturnCode() != null)
                                                .collect(Collectors.toMap(
                                                                r -> r.getSalesOrder().getId(),
                                                                ReturnOrder::getReturnCode,
                                                                (first, latest) -> latest));

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
                                                returnCodeByOrderId.get(o.getId()),
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
        private SalesOrderListResponse.Item toHistoryItem(SalesOrder o,
                        String returnCode,
                        BigDecimal debtPaid,
                        Instant now) {
                boolean isDebt = Boolean.TRUE.equals(o.getIsDebt());
                BigDecimal remainingDebt = isDebt
                                ? DebtCalculator.remaining(o.getTotalAmount(), o.getPaidAmount(), debtPaid)
                                : null;

                return SalesOrderListResponse.Item.builder()
                                .id(o.getId())
                                .orderCode(o.getOrderCode())
                                .returnCode(returnCode)
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
         * Khách bị xóa (OnDelete SET_NULL) hoặc đơn nợ dữ liệu cũ không có khách
         * thì coi như không cần rà soát — không có ai để rà.
         */
        private boolean isCustomerDebtUnstable(Customer customer) {
                return customer != null && Boolean.TRUE.equals(customer.getIsCheckUnstableDebt());
        }

        private String toLikePattern(String keyword) {
                return (keyword == null || keyword.isBlank())
                                ? null
                                : "%" + keyword.trim().toLowerCase() + "%";
        }
}
