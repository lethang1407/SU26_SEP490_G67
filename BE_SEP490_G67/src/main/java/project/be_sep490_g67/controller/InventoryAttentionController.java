package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ExpiredBatchResponse;
import project.be_sep490_g67.dto.response.InventoryAttentionResponse;
import project.be_sep490_g67.dto.response.RestockAdviceResponse;
import project.be_sep490_g67.service.InventoryAttentionService;
import project.be_sep490_g67.service.RestockAdviceService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.INVENTORY_ATTENTION)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InventoryAttentionController {

    InventoryAttentionService inventoryAttentionService;
    RestockAdviceService restockAdviceService;

    /**
     * Thẻ "Kho hàng" trên dashboard: ba nhóm việc kèm mức độ nghiêm trọng.
     */
    @GetMapping
    public ApiResponse<InventoryAttentionResponse> getInventoryAttention() {
        return ApiResponse.<InventoryAttentionResponse>builder()
                .result(inventoryAttentionService.getInventoryAttention())
                .message("Lấy cảnh báo kho hàng thành công")
                .build();
    }

    /**
     * Danh sách hiện ra khi bấm "Hàng hết hạn" - theo từng lô đã quá hạn.
     */
    @GetMapping("/expired-batches")
    public ApiResponse<List<ExpiredBatchResponse>> getExpiredBatches() {
        return ApiResponse.<List<ExpiredBatchResponse>>builder()
                .result(inventoryAttentionService.getExpiredBatches())
                .message("Lấy danh sách lô hàng hết hạn thành công")
                .build();
    }

    /**
     * Widget "Sản phẩm cần quyết định nhập hàng": sản phẩm tồn thấp/hết hàng, đã phân
     * loạic theo sản lượng bán gần đây và xếp hạng sẵn.
     *
     * @param limit      số dòng muốn lấy; bỏ trống thì theo store_config
     * @param windowDays cửa sổ đánh giá sản lượng bán; bỏ trống thì theo store_config
     */
    @GetMapping("/restock-advice")
    public ApiResponse<RestockAdviceResponse> getRestockAdvice(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer windowDays) {
        return ApiResponse.<RestockAdviceResponse>builder()
                .result(restockAdviceService.getRestockAdvice(limit, windowDays))
                .message("Lấy gợi ý nhập hàng thành công")
                .build();
    }

    /**
     * Chủ cửa hàng đã xem và bỏ qua sản phẩm này: ẩn khỏi widget cho tới hết ngày.
     * Sang ngày mới hệ thống đánh giá lại, còn thoả điều kiện thì sản phẩm hiện lại.
     */
    @PostMapping("/restock-advice/{productId}/dismiss")
    public ApiResponse<Void> dismissRestockAdvice(@PathVariable Integer productId) {
        restockAdviceService.dismiss(productId);
        return ApiResponse.<Void>builder()
                .message("Đã bỏ qua sản phẩm trong hôm nay")
                .build();
    }
}
