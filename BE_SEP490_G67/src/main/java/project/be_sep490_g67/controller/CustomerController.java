package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CustomerRequest;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.service.CustomerService;
import project.be_sep490_g67.service.DebtPaymentService;

import java.time.LocalDate;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping(ApiPath.CUSTOMERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerController {
    CustomerService customerService;
    DebtPaymentService debtPaymentService;

    /**
     * GET /api/customers/phone-lookup?phone=...
     * POS phone search: returns customer if found, null result if not.
     */
    @PreAuthorize("hasAuthority('CUSTOMER:VIEW')")
    @GetMapping("/phone-lookup")
    public ApiResponse<CustomerResponse> lookupByPhone(@RequestParam String phone) {
        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.findByPhone(phone).orElse(null))
                .message("Tra cứu khách hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:DEBT_VIEW')")
    @GetMapping("/overview")
    public ApiResponse<CustomerDebtOverviewResponse> getDebtOverview() {
        return ApiResponse.<CustomerDebtOverviewResponse>builder()
                .result(debtPaymentService.getDebtOverview())
                .message("Lấy tổng quan công nợ khách hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:DEBT_MANAGE')")
    @PostMapping
    public ApiResponse<CustomerResponse> createCustomer(@Valid @RequestBody CustomerRequest request) {
        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.createCustomer(request))
                .message("Thêm mới khách nợ thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:DEBT_VIEW')")
    @GetMapping("/debts")
    public ApiResponse<PageResponse<CustomerResponse>> getCustomerDebts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(required = false) Boolean allowDebt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false) String sortBy) {
        PageResponse<CustomerResponse> result = customerService.getCustomerDebts(keyword, status, allowDebt,
                fromDate, toDate, page, size, isOverdue, sortBy);
        return ApiResponse.<PageResponse<CustomerResponse>>builder()
                .result(result)
                .message("Lấy danh sách khách hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:VIEW')")
    @GetMapping("/{id}")
    public ApiResponse<CustomerResponse> getCustomerDetails(@PathVariable Integer id) {
        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.getCustomerDetails(id))
                .message("Lấy thông tin chi tiết khách hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:DEBT_VIEW')")
    @GetMapping("/{customerId}/debt-orders")
    public ApiResponse<PageResponse<DebtOrderResponse>> getDebtOrdersForCustomer(
            @PathVariable Integer customerId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        return ApiResponse.<PageResponse<DebtOrderResponse>>builder()
                .result(customerService.getDebtOrdersForCustomer(customerId, keyword, page, size))
                .message("Lấy danh sách hóa đơn nợ của khách hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('CUSTOMER:DEBT_MANAGE')")
    @PutMapping("/{id}")
    public ApiResponse<CustomerResponse> updateCustomer(@PathVariable Integer id, @Valid @RequestBody CustomerRequest request) {
        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.updateCustomer(id, request))
                .message("Cập nhật thông tin khách hàng thành công")
                .build();
    }

    @GetMapping("/today-debt-summary")
    public ApiResponse<TodaysDebtSalesSummaryResponse> getTodaysDebtSalesSummary() {
        TodaysDebtSalesSummaryResponse result = customerService.getTodaysDebtSalesSummary();
        return ApiResponse.<TodaysDebtSalesSummaryResponse>builder()
                .result(result)
                .message("Lấy tổng hợp bán nợ trong ngày thành công")
                .build();
    }
}