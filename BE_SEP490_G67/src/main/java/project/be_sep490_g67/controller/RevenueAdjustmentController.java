package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.service.AccountingService;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGER')")
@RequestMapping(ApiPath.BASE_URL_V1 + "/accounting/tax-profiles/{year}/adjustments")
public class RevenueAdjustmentController {
    private final AccountingService accountingService;

    @GetMapping
    public ApiResponse<PageResponse<RevenueAdjustmentResponse>> list(
            @PathVariable Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(accountingService.getAdjustments(year, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<RevenueAdjustmentResponse> get(@PathVariable Integer year, @PathVariable Integer id) {
        return ApiResponse.success(accountingService.getAdjustment(year, id));
    }

    @PostMapping
    public ApiResponse<RevenueAdjustmentResponse> create(@PathVariable Integer year,
            @Valid @RequestBody CreateRevenueAdjustmentRequest request) {
        return ApiResponse.success(accountingService.createAdjustment(year, request));
    }

    @PutMapping("/{id}")
    public ApiResponse<RevenueAdjustmentResponse> update(@PathVariable Integer year, @PathVariable Integer id,
            @Valid @RequestBody UpdateRevenueAdjustmentRequest request) {
        return ApiResponse.success(accountingService.updateAdjustment(year, id, request));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<RevenueAdjustmentResponse> approve(@PathVariable Integer year, @PathVariable Integer id,
            @Valid @RequestBody ApproveRevenueAdjustmentRequest request) {
        return ApiResponse.success(accountingService.approveAdjustment(year, id, request));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<RevenueAdjustmentResponse> reject(@PathVariable Integer year, @PathVariable Integer id,
            @Valid @RequestBody AccountingDecisionRequest request) {
        return ApiResponse.success(accountingService.rejectAdjustment(year, id, request));
    }
}

