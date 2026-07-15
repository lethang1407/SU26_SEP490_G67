package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.service.ImportOrderService;

@Slf4j
@RestController
@RequestMapping(ApiPath.IMPORT_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderController {

    ImportOrderService importOrderService;

    @GetMapping("/{id}")
    public ApiResponse<ImportOrderDetailResponse> getImportOrderDetail(@PathVariable Integer id) {
        return ApiResponse.<ImportOrderDetailResponse>builder()
                .result(importOrderService.getImportOrderDetail(id))
                .message("Lấy chi tiết đơn nhập hàng thành công")
                .build();
    }
}
