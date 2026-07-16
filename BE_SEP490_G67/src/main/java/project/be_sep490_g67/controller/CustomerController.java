package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateCustomerRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.CustomerDebtOverviewResponse;
import project.be_sep490_g67.dto.response.CustomerResponse;
import project.be_sep490_g67.dto.response.DebtOrderResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.enums.DebtStatus;
import project.be_sep490_g67.service.CustomerDebtPaymentService;
import project.be_sep490_g67.service.CustomerService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiPath.CUSTOMERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerController {
    CustomerService customerService;
    CustomerDebtPaymentService debtService;

    @GetMapping("/overview")
    public ApiResponse<CustomerDebtOverviewResponse> getDebtOverview() {
        return ApiResponse.<CustomerDebtOverviewResponse>builder()
                .result(debtService.getDebtOverview())
                .message("Lấy tổng quan công nợ khách hàng thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<CustomerResponse> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {

        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.createCustomer(request))
                .message("Thêm mới khách nợ thành công")
                .build();
    }

    @GetMapping("/debts")
    public ApiResponse<PageResponse<CustomerResponse>> getCustomerDebts(
            @RequestParam(required = false) String keyword,

            @RequestParam(required = false)
            DebtStatus status,

            @RequestParam(required = false)
            Boolean allowDebt,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate,

            @RequestParam(defaultValue = "1")
            Integer page,

            @RequestParam(defaultValue = "10")
            Integer size,

            @RequestParam(required = false)
            Boolean isOverdue,

            @RequestParam(required = false)
            String sortBy
    ) {
        PageResponse<CustomerResponse> result = customerService.getCustomerDebts(keyword, status, allowDebt, fromDate, toDate, page, size, isOverdue, sortBy);

        return ApiResponse.<PageResponse<CustomerResponse>>builder()
                .result(result)
                .message("Lấy danh sách khách hàng thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<CustomerResponse> getCustomerDetails(@PathVariable Integer id) {
        return ApiResponse.<CustomerResponse>builder()
                .result(customerService.getCustomerDetails(id))
                .message("Lấy thông tin chi tiết khách hàng thành công")
                .build();
    }

    @GetMapping("/{customerId}/debt-orders")
    public ApiResponse<PageResponse<DebtOrderResponse>> getDebtOrdersForCustomer(
            @PathVariable Integer customerId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        return ApiResponse.<PageResponse<DebtOrderResponse>>builder()
                .result(customerService.getDebtOrdersForCustomer(customerId, keyword, page, size))
                .message("Lấy danh sách hóa đơn nợ của khách hàng thành công")
                .build();
    }
}