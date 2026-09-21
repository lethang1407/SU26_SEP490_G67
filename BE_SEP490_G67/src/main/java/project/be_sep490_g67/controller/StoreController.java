package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.UpdateStoreRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.StorePaymentInfoResponse;
import project.be_sep490_g67.dto.response.StoreResponse;
import project.be_sep490_g67.service.StoreService;
import project.be_sep490_g67.dto.request.CreateTaxProfileRequest;
import project.be_sep490_g67.dto.request.UpdateTaxProfileRequest;
import project.be_sep490_g67.dto.request.ConfirmTaxProfileRequest;
import project.be_sep490_g67.dto.request.ChangeTrackingStartRequest;
import project.be_sep490_g67.dto.response.TaxProfileResponse;
import java.util.List;

@RestController
@RequestMapping(ApiPath.STORE)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StoreController {
    StoreService storeService;

    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/tax-profiles")
    public ApiResponse<List<TaxProfileResponse>> getTaxProfiles() {
        return ApiResponse.<List<TaxProfileResponse>>builder().result(storeService.getTaxProfiles()).build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/tax-profiles/{year}")
    public ApiResponse<TaxProfileResponse> getTaxProfile(@PathVariable Integer year) {
        return ApiResponse.<TaxProfileResponse>builder().result(storeService.getTaxProfile(year)).build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @PostMapping("/tax-profiles")
    public ApiResponse<TaxProfileResponse> createTaxProfile(@Valid @RequestBody CreateTaxProfileRequest request) {
        return ApiResponse.<TaxProfileResponse>builder().result(storeService.createTaxProfile(request)).build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @PutMapping("/tax-profiles/{year}")
    public ApiResponse<TaxProfileResponse> updateTaxProfile(@PathVariable Integer year,
            @Valid @RequestBody UpdateTaxProfileRequest request) {
        return ApiResponse.<TaxProfileResponse>builder().result(storeService.updateTaxProfile(year, request)).build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @PostMapping("/tax-profiles/{year}/confirm")
    public ApiResponse<TaxProfileResponse> confirmTaxProfile(@PathVariable Integer year,
            @Valid @RequestBody ConfirmTaxProfileRequest request) {
        return ApiResponse.<TaxProfileResponse>builder().result(storeService.confirmTaxProfile(year, request)).build();
    }

    @PreAuthorize("hasRole('MANAGER')")
    @PutMapping("/tax-profiles/{year}/tracking-start")
    public ApiResponse<List<TaxProfileResponse>> changeTrackingStart(@PathVariable Integer year,
            @Valid @RequestBody ChangeTrackingStartRequest request) {
        return ApiResponse.<List<TaxProfileResponse>>builder()
                .result(storeService.changeTrackingStart(year, request)).build();
    }

    @PreAuthorize("hasRole('MANAGER') or hasAuthority('STORE:VIEW')")
    @GetMapping
    ApiResponse<StoreResponse> getStoreInfor() {
        StoreResponse storeInfo = storeService.getStoreInfo();
        return ApiResponse.<StoreResponse>builder()
                .result(storeInfo)
                .message("Lấy thông tin pháp lý cửa hàng thành công")
                .build();
    }

    /**
     * GET /api/store/payment-info
     */
    @GetMapping("/payment-info")
    ApiResponse<StorePaymentInfoResponse> getStorePaymentInfo() {
        return ApiResponse.<StorePaymentInfoResponse>builder()
                .result(storeService.getPaymentInfo())
                .message("Lấy thông tin chuyển khoản của cửa hàng thành công")
                .build();
    }

    @PreAuthorize("hasRole('MANAGER') or hasAuthority('STORE:UPDATE')")
    @PutMapping
    ApiResponse<StoreResponse> updateStoreInfor(@Valid @RequestBody UpdateStoreRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        StoreResponse updateStore = storeService.updateStoreInfo(request, username);
        return ApiResponse.<StoreResponse>builder()
                .result(updateStore)
                .message("Cập nhật thông tin cửa hàng thành công")
                .build();
    }
}
