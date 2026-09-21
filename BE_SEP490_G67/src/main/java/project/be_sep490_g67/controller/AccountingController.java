package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateAccountingPeriodRequest;
import project.be_sep490_g67.dto.response.AccountingPeriodResponse;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.AccountingRevenueResponse;
import project.be_sep490_g67.dto.response.AccountingSummaryResponse;
import project.be_sep490_g67.dto.response.S1aRevenueBookResponse;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.service.TaxTemplateService;
import project.be_sep490_g67.service.AccountingService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(ApiPath.BASE_URL_V1 + "/accounting/tax-profiles/{year}/periods")
@PreAuthorize("hasRole('MANAGER')")
public class AccountingController {
    private final AccountingService accountingService;
    @Autowired
    private TaxTemplateService taxTemplateService;

    // The response sets the document content type explicitly.  Do not constrain
    // the mapping with `produces`: when the service rejects an export (409), the
    // exception handler must still be able to return its JSON error response.
    @GetMapping(value = "/tax-support/01-tkn-cnkd.docx")
    public ResponseEntity<byte[]> annualRevenueNotice(@PathVariable Integer year,
            @RequestParam(defaultValue = "YEAR") TaxPeriodType periodType) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"01-TKN-CNKD-" + year + ".docx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(taxTemplateService.exportAnnualRevenueNotice(year, periodType));
    }

    @GetMapping("/{month}/tax-support/s1a")
    public ApiResponse<S1aRevenueBookResponse> s1a(@PathVariable Integer year,
            @PathVariable Integer month) {
        return ApiResponse.success(accountingService.getS1aRevenueBook(year, month));
    }

    @GetMapping(value = "/{month}/tax-support/s1a.xlsx")
    public ResponseEntity<byte[]> s1aExcel(@PathVariable Integer year, @PathVariable Integer month) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"S1a-HKD-" + year + "-" + month + ".xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(accountingService.exportS1aRevenueBook(year, month));
    }

    @GetMapping("/summary/months/{month}")
    public ApiResponse<AccountingSummaryResponse> monthlySummary(@PathVariable Integer year,
            @PathVariable Integer month) {
        return ApiResponse.success(accountingService.getMonthlySummary(year, month));
    }

    @GetMapping("/summary/quarters/{quarter}")
    public ApiResponse<AccountingSummaryResponse> quarterlySummary(@PathVariable Integer year,
            @PathVariable Integer quarter) {
        return ApiResponse.success(accountingService.getQuarterSummary(year, quarter));
    }

    @GetMapping("/summary")
    public ApiResponse<AccountingSummaryResponse> yearlySummary(@PathVariable Integer year) {
        return ApiResponse.success(accountingService.getYearSummary(year));
    }

    @GetMapping("/{month}/reconciliation")
    public ApiResponse<project.be_sep490_g67.dto.response.AccountingReconciliationResponse> reconcile(
            @PathVariable Integer year, @PathVariable Integer month) {
        return ApiResponse.success(accountingService.reconcilePeriod(year, month));
    }

    @PostMapping("/{month}/close")
    public ApiResponse<AccountingPeriodResponse> close(@PathVariable Integer year, @PathVariable Integer month,
            @Valid @RequestBody project.be_sep490_g67.dto.request.AccountingDecisionRequest request) {
        return ApiResponse.success(accountingService.closePeriod(year, month, request));
    }

    @GetMapping("/{month}/revenue-lines")
    public ApiResponse<AccountingRevenueResponse> getRevenue(@PathVariable Integer year, @PathVariable Integer month) {
        return ApiResponse.success(accountingService.getRevenue(year, month));
    }

    @PostMapping("/{month}/revenue-lines/synchronize")
    public ApiResponse<AccountingRevenueResponse> synchronizeRevenue(@PathVariable Integer year, @PathVariable Integer month) {
        return ApiResponse.success(accountingService.synchronizeRevenue(year, month));
    }

    @GetMapping
    public ApiResponse<List<AccountingPeriodResponse>> getPeriods(@PathVariable Integer year) {
        return ApiResponse.success(accountingService.getPeriods(year));
    }

    @GetMapping("/{month}")
    public ApiResponse<AccountingPeriodResponse> getPeriod(@PathVariable Integer year, @PathVariable Integer month) {
        return ApiResponse.success(accountingService.getPeriod(year, month));
    }

    @PostMapping
    public ApiResponse<AccountingPeriodResponse> createPeriod(@PathVariable Integer year,
            @Valid @RequestBody CreateAccountingPeriodRequest request) {
        return ApiResponse.success(accountingService.createPeriod(year, request));
    }
}
