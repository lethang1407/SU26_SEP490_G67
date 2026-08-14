package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.request.CreateSupplierPaymentRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.SupplierDetailResponse;
import project.be_sep490_g67.dto.response.SupplierListPageResponse;
import project.be_sep490_g67.dto.response.SupplierPaymentResponse;
import project.be_sep490_g67.service.ImportOrderService;
import project.be_sep490_g67.service.SupplierPaymentService;
import project.be_sep490_g67.service.SupplierService;

import java.time.LocalDate;

import org.springframework.security.access.prepost.PreAuthorize;

@Slf4j
@RestController
@RequestMapping(ApiPath.SUPPLIER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierController {

    SupplierService supplierService;
    ImportOrderService importOrderService;
    SupplierPaymentService supplierPaymentService;

    @PreAuthorize("hasAuthority('SUPPLIER:VIEW')")
    @GetMapping
    public ApiResponse<SupplierListPageResponse> getSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer categoryId
    ) {
        SupplierListPageResponse result = supplierService.findAllSuppliers(search, categoryId, page, size);
        return ApiResponse.<SupplierListPageResponse>builder()
                .result(result)
                .message("Lấy danh sách nhà cung cấp thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:VIEW')")
    @GetMapping("/{id}")
    public ApiResponse<SupplierDetailResponse> getSupplierDetail(@PathVariable Integer id) {
        return ApiResponse.<SupplierDetailResponse>builder()
                .result(supplierService.getSupplierDetail(id))
                .message("Lấy thông tin nhà cung cấp thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:UPDATE')")
    @PutMapping("/{id}")
    public ApiResponse<SupplierDetailResponse> updateSupplier(
            @PathVariable Integer id,
            @Valid @RequestBody AddNewSupplierRequest request
    ) {
        return ApiResponse.<SupplierDetailResponse>builder()
                .result(supplierService.updateSupplier(id, request))
                .message("Cập nhật nhà cung cấp thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:DELETE')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteSupplier(@PathVariable Integer id) {
        supplierService.deleteSupplier(id);
        return ApiResponse.<Void>builder()
                .message("Xóa nhà cung cấp thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:VIEW')")
    @GetMapping("/{id}/import-orders")
    public ApiResponse<PageResponse<ImportOrderListItemResponse>> getImportHistory(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String status
    ) {
        return ApiResponse.<PageResponse<ImportOrderListItemResponse>>builder()
                .result(importOrderService.getImportHistory(id, search, status, page, size))
                .message("Lấy lịch sử nhập hàng thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:PAYMENT')")
    @PostMapping("/{id}/payments")
    public ApiResponse<SupplierPaymentResponse> createPayment(
            @PathVariable Integer id,
            @RequestBody CreateSupplierPaymentRequest request
    ) {
        return ApiResponse.<SupplierPaymentResponse>builder()
                .result(supplierPaymentService.createPayment(id, request))
                .message("Ghi nhận thanh toán nợ thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:VIEW')")
    @GetMapping("/{id}/payments")
    public ApiResponse<PageResponse<SupplierPaymentResponse>> getPaymentHistory(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.<PageResponse<SupplierPaymentResponse>>builder()
                .result(supplierPaymentService.getPaymentHistory(id, search, fromDate, toDate, page, size))
                .message("Lấy lịch sử thanh toán nợ thành công")
                .build();
    }

    @PreAuthorize("hasAuthority('SUPPLIER:CREATE')")
    @PostMapping
    public ApiResponse<AddNewSupplierResponse> addNewSupplier(@Valid @RequestBody AddNewSupplierRequest request) {
        log.info("Api in controller was called with request: {}", request);
        return ApiResponse.<AddNewSupplierResponse>builder()
                .result(supplierService.addNewSupplier(request))
                .build();
    }
}
