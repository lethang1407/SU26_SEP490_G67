package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.SalesOrderResponse;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.SalesOrderService;

@RestController
@RequestMapping(ApiPath.SALES_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesOrderController {

    SalesOrderService salesOrderService;
    UserRepository userRepository;

    /**
     * POST /api/sales-orders
     * Create a standard invoice (customer found).
     */
    @PostMapping
    ApiResponse<SalesOrderResponse> createOrder(@Valid @RequestBody CreateSalesOrderRequest request) {
        Integer staffId = resolveStaffId();
        SalesOrderResponse result = salesOrderService.createOrder(request, false, staffId);
        return ApiResponse.<SalesOrderResponse>builder()
                .result(result)
                .message("Tạo đơn hàng thành công")
                .build();
    }

    /**
     * POST /api/sales-orders/debt
     * Create a debt invoice (customer not found or anonymous sale).
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
     * Fetch receipt data for a completed order (used for printing).
     */
    @GetMapping("/{id}/receipt")
    ApiResponse<SalesOrderResponse> getReceipt(@PathVariable Integer id) {
        SalesOrderResponse result = salesOrderService.getReceipt(id);
        return ApiResponse.<SalesOrderResponse>builder()
                .result(result)
                .build();
    }

    // Helpers

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(u -> u.getId())
                .orElse(null);
    }
}
