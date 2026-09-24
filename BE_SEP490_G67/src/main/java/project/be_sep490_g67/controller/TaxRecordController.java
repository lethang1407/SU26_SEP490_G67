package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.ConfirmTaxRecordRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.TaxRecordResponse;
import project.be_sep490_g67.service.TaxRecordService;

/** API xem, tính lại và xác nhận nghĩa vụ thuế năm. */
@RestController
@RequiredArgsConstructor
@RequestMapping(ApiPath.BASE_URL_V1 + "/accounting/tax-profiles/{year}/tax-record")
@PreAuthorize("hasRole('MANAGER')")
public class TaxRecordController {
    private final TaxRecordService taxRecordService;

    @GetMapping
    public ApiResponse<TaxRecordResponse> get(@PathVariable Integer year) {
        return ApiResponse.success(TaxRecordResponse.from(taxRecordService.getAnnual(year)));
    }

    @PostMapping("/calculate")
    public ApiResponse<TaxRecordResponse> calculate(@PathVariable Integer year) {
        return ApiResponse.success(TaxRecordResponse.from(taxRecordService.calculateAnnual(year)));
    }

    @PostMapping("/confirm")
    public ApiResponse<TaxRecordResponse> confirm(@PathVariable Integer year,
            @Valid @RequestBody ConfirmTaxRecordRequest request) {
        return ApiResponse.success(TaxRecordResponse.from(taxRecordService.confirmAnnual(year, request)));
    }

    @PostMapping("/declare")
    public ApiResponse<TaxRecordResponse> declare(@PathVariable Integer year) {
        return ApiResponse.success(TaxRecordResponse.from(taxRecordService.declareAnnual(year)));
    }
}
