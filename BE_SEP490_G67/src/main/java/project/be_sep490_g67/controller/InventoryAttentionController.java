package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ExpiredBatchResponse;
import project.be_sep490_g67.dto.response.InventoryAttentionResponse;
import project.be_sep490_g67.service.InventoryAttentionService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.INVENTORY_ATTENTION)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InventoryAttentionController {

    InventoryAttentionService inventoryAttentionService;

    /** Thẻ "Kho hàng" trên dashboard: ba nhóm việc kèm mức độ nghiêm trọng. */
    @GetMapping
    public ApiResponse<InventoryAttentionResponse> getInventoryAttention() {
        return ApiResponse.<InventoryAttentionResponse>builder()
                .result(inventoryAttentionService.getInventoryAttention())
                .message("Lấy cảnh báo kho hàng thành công")
                .build();
    }

    /** Danh sách hiện ra khi bấm "Hàng hết hạn" — theo từng lô đã quá hạn. */
    @GetMapping("/expired-batches")
    public ApiResponse<List<ExpiredBatchResponse>> getExpiredBatches() {
        return ApiResponse.<List<ExpiredBatchResponse>>builder()
                .result(inventoryAttentionService.getExpiredBatches())
                .message("Lấy danh sách lô hàng hết hạn thành công")
                .build();
    }
}
