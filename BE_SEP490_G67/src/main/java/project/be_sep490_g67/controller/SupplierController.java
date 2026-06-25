package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.SupplierListPageResponse;
import project.be_sep490_g67.service.SupplierService;

@Slf4j
@RestController
@RequestMapping(ApiPath.SUPPLIER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierController {

    SupplierService supplierService;

    @GetMapping
    public ApiResponse<SupplierListPageResponse> getSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String debtFilter
    ) {
        SupplierListPageResponse result = supplierService.findAllSuppliers(search, debtFilter, page, size);
        return ApiResponse.<SupplierListPageResponse>builder()
                .result(result)
                .message("Lấy danh sách nhà cung cấp thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<AddNewSupplierResponse> addNewSupplier(@RequestBody AddNewSupplierRequest request) {
        log.info("Api in controller was called with request: {}", request);
        return ApiResponse.<AddNewSupplierResponse>builder()
                .result(supplierService.addNewSupplier(request))
                .build();
    }
}
