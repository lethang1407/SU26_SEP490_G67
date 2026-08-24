package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateSalesOrderRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.CheckoutSessionResponse;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.PayosCheckoutService;

@RestController
@RequestMapping(ApiPath.CHECKOUT)
@RequiredArgsConstructor
public class CheckoutController {

    private final PayosCheckoutService payosCheckoutService;
    private final UserRepository userRepository;

    /**
     * POST /api/checkout/payos
     */
    @PostMapping("/payos")
    ApiResponse<CheckoutSessionResponse> createCheckoutSession(
            @Valid @RequestBody CreateSalesOrderRequest request) {
        CheckoutSessionResponse result = payosCheckoutService.createSession(request, resolveStaffId());
        return ApiResponse.<CheckoutSessionResponse>builder()
                .result(result)
                .message("Tạo mã QR chuyển khoản thành công")
                .build();
    }

    /**
     * GET /api/checkout/payos/{payosOrderCode}
     */
    @GetMapping("/payos/{payosOrderCode}")
    ApiResponse<CheckoutSessionResponse> getCheckoutSession(@PathVariable Long payosOrderCode) {
        CheckoutSessionResponse result = payosCheckoutService.getStatus(payosOrderCode);
        return ApiResponse.<CheckoutSessionResponse>builder()
                .result(result)
                .message("Lấy trạng thái thanh toán thành công")
                .build();
    }

    /**
     * POST /api/checkout/payos/{payosOrderCode}/cancel
     */
    @PostMapping("/payos/{payosOrderCode}/cancel")
    ApiResponse<CheckoutSessionResponse> cancelCheckoutSession(
            @PathVariable Long payosOrderCode,
            @RequestParam(required = false) String reason) {
        CheckoutSessionResponse result = payosCheckoutService.cancel(payosOrderCode, reason);
        return ApiResponse.<CheckoutSessionResponse>builder()
                .result(result)
                .message("Đã hủy phiên thanh toán chuyển khoản")
                .build();
    }

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);
    }
}
