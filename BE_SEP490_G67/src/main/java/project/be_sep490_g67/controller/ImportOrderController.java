package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.ImportOrderService;

@Slf4j
@RestController
@RequestMapping(ApiPath.IMPORT_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderController {

    ImportOrderService importOrderService;
    UserRepository userRepository;

    @GetMapping
    public ApiResponse<PageResponse<ImportOrderListItemResponse>> getImportOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ImportOrderListItemResponse>>builder()
                .result(importOrderService.getImportOrders(search, status, page, size))
                .message("Lấy danh sách đơn nhập hàng thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<ImportOrderDetailResponse> getImportOrderDetail(@PathVariable Integer id) {
        return ApiResponse.<ImportOrderDetailResponse>builder()
                .result(importOrderService.getImportOrderDetail(id))
                .message("Lấy chi tiết đơn nhập hàng thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<ImportOrderDetailResponse> createImportOrder(
            @Valid @RequestBody CreateImportOrderRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportOrderDetailResponse>builder()
                .result(importOrderService.createImportOrder(request, staffId))
                .message("Tạo phiếu nhập hàng thành công. Đã tạo lô hàng trong kho.")
                .build();
    }

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(u -> u.getId())
                .orElse(null);
    }
}
