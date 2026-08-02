package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.request.ImportSuggestRequest;
import project.be_sep490_g67.dto.response.*;
import project.be_sep490_g67.service.ImportOrderService;
import project.be_sep490_g67.dto.response.ImportOrderResponseDTO;
import project.be_sep490_g67.dto.response.ImportSuggestionDTO;
import project.be_sep490_g67.service.ImportSuggestionService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping(ApiPath.IMPORT_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderController {

    ImportSuggestionService importSuggestionService;
    ImportOrderService importOrderService;

    @GetMapping
    public ApiResponse<PageResponse<ImportOrderListItemResponse>> getImportOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String orderStatus
    ) {
        return ApiResponse.<PageResponse<ImportOrderListItemResponse>>builder()
                .result(importOrderService.getImportOrderList(search, orderStatus, page, size))
                .message("Lấy danh sách đơn nhập hàng thành công")
                .build();
    }
    @PostMapping("/suggest")
    public ApiResponse<List<ImportSuggestionDTO>> suggest(@RequestBody ImportSuggestRequest request) {
        List<ImportSuggestionDTO> result = importSuggestionService.getSuggestions(request);
        return ApiResponse.<List<ImportSuggestionDTO>>builder()
                .result(result)
                .message("Gợi ý nhập hàng thành công")
                .build();
    }
    @PostMapping("/suggest")
    public ApiResponse<List<ImportSuggestionDTO>> suggest(@RequestBody ImportSuggestRequest request) {
        List<ImportSuggestionDTO> result = importSuggestionService.getSuggestions(request);
        return ApiResponse.<List<ImportSuggestionDTO>>builder()
                .result(result)
                .message("Gợi ý nhập hàng thành công")
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
    public ApiResponse<List<ImportOrderResponseDTO>> create(@RequestBody CreateImportOrderRequest request) {
        List<ImportOrderResponseDTO> result = importOrderService.createOrders(request);
        return ApiResponse.<List<ImportOrderResponseDTO>>builder()
                .result(result)
                .message("Tạo đơn nhập thành công")
                .build();
    }
}
