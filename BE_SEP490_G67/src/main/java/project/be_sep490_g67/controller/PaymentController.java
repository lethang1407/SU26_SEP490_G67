package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.ConfirmWebhookRequestBody;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.service.PayosCheckoutService;
import vn.payos.PayOS;
import vn.payos.model.webhooks.WebhookData;

/**
 * Đầu nhận tín hiệu từ PayOS.
 */
@RestController
@RequestMapping(ApiPath.PAYMENT_METHODS)
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayOS payOS;
    private final PayosCheckoutService payosCheckoutService;

    /**
     * POST /api/payment/payment_transfer_handle
     * PayOS gọi vào đây mỗi khi có biến động giao dịch.
     */
    @PostMapping("/payment_transfer_handle")
    public ApiResponse<WebhookData> payosTransferHandler(@RequestBody Object body) {
        try {
            WebhookData data = payosCheckoutService.handleWebhook(body);
            return ApiResponse.success("Webhook delivered", data);
        } catch (Exception e) {
            log.error("Xử lý webhook PayOS thất bại", e);
            return ApiResponse.error("Không xử lý được webhook PayOS", e.getMessage());
        }
    }

    /**
     * POST /api/payment/confirm-webhook
     *
     * <p>Đăng ký URL webhook với PayOS. Chạy một lần sau mỗi lần đổi tên miền (hoặc
     * đổi địa chỉ ngrok lúc phát triển) — PayOS sẽ gọi thử URL trước khi chấp nhận.
     */
    @PostMapping("/confirm-webhook")
    public ApiResponse<String> confirmWebhook(@RequestBody ConfirmWebhookRequestBody body) {
        try {
            payOS.webhooks().confirm(body.getWebhookUrl());
            return ApiResponse.success("Đăng ký webhook thành công", body.getWebhookUrl());
        } catch (Exception e) {
            log.error("Đăng ký webhook PayOS thất bại: {}", body.getWebhookUrl(), e);
            return ApiResponse.error("Đăng ký webhook PayOS thất bại", e.getMessage());
        }
    }
}
