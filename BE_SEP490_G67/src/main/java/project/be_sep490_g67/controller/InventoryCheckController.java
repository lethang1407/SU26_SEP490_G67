package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateInventoryCheckRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.InventoryCheckAttentionItemResponse;
import project.be_sep490_g67.dto.response.InventoryCheckDetailResponse;
import project.be_sep490_g67.dto.response.InventoryCheckListItemResponse;
import project.be_sep490_g67.dto.response.InventoryCheckProductPreviewResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.InventoryCheckService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.INVENTORY_CHECKS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InventoryCheckController {

    InventoryCheckService inventoryCheckService;
    UserRepository userRepository;

    @GetMapping
    public ApiResponse<PageResponse<InventoryCheckListItemResponse>> getChecks(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "all") String status,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<InventoryCheckListItemResponse>>builder()
                .result(inventoryCheckService.getChecks(search, status, page, size))
                .message("Lấy danh sách phiếu kiểm kho thành công")
                .build();
    }

    @GetMapping("/attention")
    public ApiResponse<List<InventoryCheckAttentionItemResponse>> getAttentionItems() {
        return ApiResponse.<List<InventoryCheckAttentionItemResponse>>builder()
                .result(inventoryCheckService.getAttentionItems())
                .message("Lấy danh sách cần kiểm ngay thành công")
                .build();
    }
   
    @GetMapping("/product-preview/{productId}")
    public ApiResponse<InventoryCheckProductPreviewResponse> getProductPreview(
            @PathVariable Integer productId) {
        return ApiResponse.<InventoryCheckProductPreviewResponse>builder()
                .result(inventoryCheckService.getProductPreview(productId))
                .message("Lấy thông tin sản phẩm kiểm kho thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<InventoryCheckDetailResponse> getCheckDetail(@PathVariable Integer id) {
        return ApiResponse.<InventoryCheckDetailResponse>builder()
                .result(inventoryCheckService.getCheckDetail(id))
                .message("Lấy chi tiết phiếu kiểm kho thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<InventoryCheckDetailResponse> createCheck(
            @Valid @RequestBody CreateInventoryCheckRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<InventoryCheckDetailResponse>builder()
                .result(inventoryCheckService.createCheck(request, staffId))
                .message("Lưu phiếu kiểm kho thành công. Đã cập nhật tồn theo kết quả kiểm.")
                .build();
    }

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(u -> u.getId())
                .orElse(null);
    }
}
