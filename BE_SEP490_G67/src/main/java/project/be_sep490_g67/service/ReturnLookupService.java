package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.ReturnLookupResponse;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.SalesOrder;
import project.be_sep490_g67.entity.SalesOrderDetail;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReturnLookupService {

    SalesOrderRepository salesOrderRepository;
    ReturnOrderDetailRepository returnOrderDetailRepository;
    ProductRepository productRepository;
    UserRepository userRepository;
    StoreConfigRepository storeConfigRepository;
    AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public ReturnLookupResponse search(String orderCode,
                                       String customerPhone,
                                       String customerName,
                                       Integer productId,
                                       String barcode,
                                       Instant from,
                                       Instant to,
                                       BigDecimal amount,
                                       BigDecimal amountTolerance,
                                       int page,
                                       int size,
                                       Integer staffId) {

        BigDecimal amountMin = null;
        BigDecimal amountMax = null;
        if (amount != null) {
            BigDecimal tolerance = amountTolerance != null ? amountTolerance : BigDecimal.ZERO;
            amountMin = amount.subtract(tolerance);
            amountMax = amount.add(tolerance);
        }

        Page<SalesOrder> found = salesOrderRepository.searchForReturn(
                like(orderCode),
                like(customerPhone),
                like(customerName),
                from,
                to,
                productId,
                barcode != null && !barcode.isBlank() ? barcode.trim().toLowerCase() : null,
                amountMin,
                amountMax,
                PageRequest.of(page, size));

        ReturnLookupResponse.SearchScope scope = buildScope(productId, barcode, customerPhone, from, to);

        if (found.isEmpty()) {
            auditLogService.logFailedReturnLookup(staffId, describe(scope));
        }

        List<SalesOrder> orders = found.getContent();
        Map<Integer, Map<Integer, Integer>> returnedByOrder = returnedQuantities(orders);

        List<ReturnLookupResponse.OrderMatch> matches = orders.stream()
                .map(order -> toMatch(order, productId, barcode, returnedByOrder))
                .collect(Collectors.toList());

        return ReturnLookupResponse.builder()
                .orders(matches)
                .totalElements(found.getTotalElements())
                .scope(scope)
                .build();
    }

    private ReturnLookupResponse.OrderMatch toMatch(SalesOrder order,
                                                    Integer productId,
                                                    String barcode,
                                                    Map<Integer, Map<Integer, Integer>> returnedByOrder) {

        Map<Integer, Integer> returnedLines = returnedByOrder.getOrDefault(order.getId(), Map.of());

        return ReturnLookupResponse.OrderMatch.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .createdAt(order.getCreatedAt())
                .cashierName(cashierName(order.getCreatedBy()))
                .customerName(order.getCustomer() != null ? order.getCustomer().getFullName() : null)
                .customerPhone(order.getCustomer() != null ? order.getCustomer().getPhoneNumber() : null)
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .partiallyReturned(!returnedLines.isEmpty())
                .matchedLine(matchedLine(order, productId, barcode, returnedLines))
                .build();
    }

    private ReturnLookupResponse.MatchedLine matchedLine(SalesOrder order,
                                                         Integer productId,
                                                         String barcode,
                                                         Map<Integer, Integer> returnedLines) {
        if (productId == null && (barcode == null || barcode.isBlank())) {
            return null;
        }

        String wantedBarcode = barcode != null ? barcode.trim().toLowerCase() : null;

        return order.getSalesOrderDetails().stream()
                .filter(detail -> !detail.getIsRemoved())
                .filter(detail -> {
                    Product product = detail.getProduct();
                    if (productId != null && productId.equals(product.getId())) {
                        return true;
                    }
                    return wantedBarcode != null
                            && product.getBarcode() != null
                            && wantedBarcode.equals(product.getBarcode().toLowerCase());
                })
                .findFirst()
                .map(detail -> {
                    int alreadyReturned = returnedLines.getOrDefault(detail.getId(), 0);
                    return ReturnLookupResponse.MatchedLine.builder()
                            .salesOrderDetailId(detail.getId())
                            .productId(detail.getProduct().getId())
                            .productName(detail.getProduct().getName())
                            .unitName(detail.getUnitName())
                            .quantity(detail.getQuantity())
                            .unitPrice(detail.getUnitPrice())
                            .quantityReturnable(detail.getQuantity() - alreadyReturned)
                            .build();
                })
                .orElse(null);
    }

    private Map<Integer, Map<Integer, Integer>> returnedQuantities(List<SalesOrder> orders) {
        if (orders.isEmpty()) {
            return Map.of();
        }
        List<Integer> ids = orders.stream().map(SalesOrder::getId).toList();

        Map<Integer, Map<Integer, Integer>> byOrder = new HashMap<>();
        for (Object[] row : returnOrderDetailRepository.sumReturnedQuantityByOrders(ids)) {
            Integer orderId = (Integer) row[0];
            Integer lineId = (Integer) row[1];
            int quantity = ((Number) row[2]).intValue();
            byOrder.computeIfAbsent(orderId, k -> new HashMap<>()).put(lineId, quantity);
        }
        return byOrder;
    }

    private ReturnLookupResponse.SearchScope buildScope(Integer productId,
                                                        String barcode,
                                                        String customerPhone,
                                                        Instant from,
                                                        Instant to) {
        String productName = null;
        if (productId != null) {
            productName = productRepository.findById(productId).map(Product::getName).orElse(null);
        } else if (barcode != null && !barcode.isBlank()) {
            productName = productRepository.findByBarcode(barcode.trim()).map(Product::getName).orElse(null);
        }

        String storeName = storeConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new AppException(ErrorCode.STORE_CONFIG_MISSING))
                .getStoreName();

        return ReturnLookupResponse.SearchScope.builder()
                .productName(productName)
                .barcode(barcode)
                .customerPhone(customerPhone)
                .storeName(storeName)
                .from(from)
                .to(to)
                .build();
    }

    private String describe(ReturnLookupResponse.SearchScope scope) {
        StringBuilder sb = new StringBuilder("Không tìm thấy giao dịch");
        if (scope.getProductName() != null) {
            sb.append(" có [").append(scope.getProductName()).append(']');
        } else if (scope.getBarcode() != null) {
            sb.append(" có mã vạch [").append(scope.getBarcode()).append(']');
        }
        if (scope.getCustomerPhone() != null) {
            sb.append(" của SĐT [").append(scope.getCustomerPhone()).append(']');
        }
        sb.append(" tại [").append(scope.getStoreName()).append(']');
        if (scope.getFrom() != null || scope.getTo() != null) {
            sb.append(" trong khoảng ").append(scope.getFrom()).append(" - ").append(scope.getTo());
        }
        return sb.toString();
    }

    private String cashierName(Integer userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findActiveById(userId).map(u -> u.getFullName()).orElse(null);
    }

    private String like(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return "%" + raw.trim().toLowerCase() + "%";
    }
}
