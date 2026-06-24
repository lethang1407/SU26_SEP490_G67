package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.service.SupplierService;

@Slf4j
@RestController
@RequestMapping(ApiPath.SUPPLIER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierController {

    SupplierService supplierService;

    @PostMapping
    public ApiResponse<AddNewSupplierResponse> addNewSupplier(@RequestBody AddNewSupplierRequest request) {
        log.info("Api in controller was called with request: {}",request);
        return ApiResponse.<AddNewSupplierResponse>builder()
                .result(supplierService.addNewSupplier(request))
                .build();
    }
}
