package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateExchangeOrderRequest;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.ExchangeOrderService;
import project.be_sep490_g67.service.InvoiceService;
import project.be_sep490_g67.service.SalesOrderService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping(ApiPath.SALES_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesOrderController {

    SalesOrderService salesOrderService;
    ExchangeOrderService exchangeOrderService;
    InvoiceService invoiceService;
    UserRepository userRepository;

    /**
     * GET /api/sales-orders
     * CASHIER sees only their own orders; ADMIN/ACCOUNTANT see all.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    ApiResponse<SalesOrderListResponse> getOrderHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findActiveByUsernameWithRole(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean isPrivileged = currentUser.getRoles().stream()
                .anyMatch(r -> {
                    String name = r.getName().toUpperCase();
                    return name.equals("ADMIN") || name.equals("ACCOUNTANT");
                });

        Integer createdByFilter = isPrivileged ? null : currentUser.getId();

        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        Instant from = dateFrom != null ? dateFrom.atStartOfDay(vnZone).toInstant() : null;
        Instant to = dateTo != null ? dateTo.plusDays(1).atStartOfDay(vnZone).toInstant() : null;

        SalesOrderListResponse result = salesOrderService.getOrderHistory(
                createdByFilter, search, from, to, page, size);

        return ApiResponse.<SalesOrderListResponse>builder().result(result).build();
    }

    /**
     * POST /api/sales-orders
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SalesOrderResponse>> createOrder(@Valid @RequestBody CreateSalesOrderRequest request) {
        Integer staffId = resolveStaffId();
        SalesOrderResponse result = salesOrderService.createOrder(request, false, staffId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo đơn hàng thành công", result));
    }

    /**
     * POST /api/sales-orders/debt
     */
    @PostMapping("/debt")
    ApiResponse<SalesOrderResponse> createDebtOrder(@Valid @RequestBody CreateSalesOrderRequest request) {
        Integer staffId = resolveStaffId();
        SalesOrderResponse result = salesOrderService.createOrder(request, true, staffId);
        return ApiResponse.<SalesOrderResponse>builder()
                .result(result)
                .message("Tạo đơn hàng nợ thành công")
                .build();
    }

    /**
     * GET /api/sales-orders/{id}/receipt
     */
    @GetMapping("/{id}/receipt")
    ApiResponse<SalesOrderResponse> getReceipt(@PathVariable Integer id) {
        SalesOrderResponse result = salesOrderService.getReceipt(id);
        return ApiResponse.<SalesOrderResponse>builder()
                .result(result)
                .build();
    }

    /**
     * GET /api/sales-orders/{id}/invoice
     * Authorization (IDOR):
     * - ADMIN / ACCOUNTANT: can access any order
     * - CASHIER: can only access orders they created
     */
    @GetMapping("/{id}/invoice")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<InvoiceResponse> getInvoice(@PathVariable Integer id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findActiveByUsernameWithRole(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean isPrivileged = currentUser.getRoles().stream()
                .anyMatch(r -> {
                    String name = r.getName().toUpperCase();
                    return name.equals("ADMIN") || name.equals("ACCOUNTANT");
                });

        InvoiceResponse result = invoiceService.getInvoice(id, currentUser.getId(), isPrivileged);
        return ApiResponse.<InvoiceResponse>builder()
                .result(result)
                .message("Lấy dữ liệu hóa đơn thành công")
                .build();
    }

    /**
     * GET /api/sales-orders/{id}/exchange
     * Get order details for exchange order page
     */
    @GetMapping("/{id}/exchange")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<ExchangeOrderDetailResponse> getOrderForExchange(@PathVariable Integer id) {
        ExchangeOrderDetailResponse result = exchangeOrderService.getOrderForExchange(id);
        return ApiResponse.<ExchangeOrderDetailResponse>builder()
                .result(result)
                .message("Lấy thông tin đơn hàng thành công")
                .build();
    }

    /**
     * POST /api/sales-orders/exchange
     * Process exchange order
     */
    @PostMapping("/exchange")
    @PreAuthorize("isAuthenticated()")
    ApiResponse<ExchangeOrderResponse> processExchangeOrder(@Valid @RequestBody CreateExchangeOrderRequest request) {
        Integer staffId = resolveStaffId();
        ExchangeOrderResponse result = exchangeOrderService.processExchangeOrder(request, staffId);
        return ApiResponse.<ExchangeOrderResponse>builder()
                .result(result)
                .message("Đổi trả hàng thành công")
                .build();
    }

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);
    }
}
