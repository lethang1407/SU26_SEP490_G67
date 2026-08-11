package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.DebtPaymentRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.DebtPaymentHistoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.service.DebtPaymentService;

import java.time.LocalDate;

@RestController
@RequestMapping(ApiPath.DEBT_PAYMENTS_CUSTOMER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DebtPaymentController {

    private final DebtPaymentService debtPaymentService;

    @PostMapping
    public ApiResponse<DebtPaymentHistoryResponse> createDebtPayment(@Valid @RequestBody DebtPaymentRequest request) {
        DebtPaymentHistoryResponse result = debtPaymentService.createDebtPayment(request);
        return ApiResponse.<DebtPaymentHistoryResponse>builder()
                .result(result)
                .message("Tạo thanh toán công nợ thành công")
                .build();
    }

    @GetMapping
    public ApiResponse<PageResponse<DebtPaymentHistoryResponse>> getDebtPaymentHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        PageResponse<DebtPaymentHistoryResponse> result = debtPaymentService.getDebtPaymentHistory(
                startDate, endDate, customerId, staffId, keyword, page, size
        );
        return ApiResponse.<PageResponse<DebtPaymentHistoryResponse>>builder()
                .result(result)
                .message("Lấy lịch sử thu nợ thành công")
                .build();
    }

    @GetMapping("/today")
    public ApiResponse<PageResponse<DebtPaymentHistoryResponse>> getTodaysDebtPayments(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        PageResponse<DebtPaymentHistoryResponse> result = debtPaymentService.getTodaysDebtPayments(page, size);
        return ApiResponse.<PageResponse<DebtPaymentHistoryResponse>>builder()
                .result(result)
                .message("Lấy danh sách thu nợ trong ngày thành công")
                .build();
    }
}