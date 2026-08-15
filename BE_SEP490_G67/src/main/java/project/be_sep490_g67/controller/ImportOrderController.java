package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateDraftFromSuggestRequest;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.request.ImportSuggestRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportOrderDetailResponse;
import project.be_sep490_g67.dto.response.ImportOrderListItemResponse;
import project.be_sep490_g67.dto.response.ImportOrderResponseDTO;
import project.be_sep490_g67.dto.response.ImportSuggestionDTO;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.SupplierPaymentResponse;
import project.be_sep490_g67.service.ImportOrderService;
import project.be_sep490_g67.service.ImportSuggestionService;
import project.be_sep490_g67.service.SupplierPaymentService;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping(ApiPath.IMPORT_ORDERS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderController {

    ImportSuggestionService importSuggestionService;
    ImportOrderService importOrderService;
    SupplierPaymentService supplierPaymentService;

    /**
     * Tạo 1 phiếu nhập (DRAFT hoặc IMPORTED). IMPORTED → tạo lô + tăng tồn.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ImportOrderListItemResponse>> createImportOrder(
            @Valid @RequestBody CreateImportOrderRequest request
    ) {
        ImportOrderListItemResponse result = importOrderService.createImportOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ImportOrderListItemResponse>builder()
                        .result(result)
                        .message("Tạo phiếu nhập hàng thành công")
                        .build());
    }

    /**
     * Tạo nhiều phiếu DRAFT từ màn Gợi ý nhập hàng (gom theo NCC). Không tăng tồn.
     */
    @PostMapping("/from-suggest")
    public ResponseEntity<ApiResponse<List<ImportOrderResponseDTO>>> createDraftsFromSuggest(
            @Valid @RequestBody CreateDraftFromSuggestRequest request
    ) {
        List<ImportOrderResponseDTO> result = importOrderService.createOrdersFromSuggest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<List<ImportOrderResponseDTO>>builder()
                        .result(result)
                        .message("Tạo đơn nhập hàng thành công")
                        .build());
    }

    @GetMapping
    public ApiResponse<PageResponse<ImportOrderListItemResponse>> getImportOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String orderStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.<PageResponse<ImportOrderListItemResponse>>builder()
                .result(importOrderService.getImportOrderList(search, orderStatus, fromDate, toDate, page, size))
                .message("Lấy danh sách đơn nhập hàng thành công")
                .build();
    }

    @PostMapping("/suggest")
    public ApiResponse<List<ImportSuggestionDTO>> suggest(@RequestBody ImportSuggestRequest request) {
        List<ImportSuggestionDTO> result = importSuggestionService.getSuggestions(request);
        return ApiResponse.<List<ImportSuggestionDTO>>builder()
                .result(result)
                .message("Gửi gợi ý thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<ImportOrderDetailResponse> getImportOrderDetail(@PathVariable Integer id) {
        return ApiResponse.<ImportOrderDetailResponse>builder()
                .result(importOrderService.getImportOrderDetail(id))
                .message("Lấy chi tiết đơn nhập hàng thành công")
                .build();
    }

    @GetMapping("/{id}/payments")
    public ApiResponse<PageResponse<SupplierPaymentResponse>> getImportOrderPayments(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.<PageResponse<SupplierPaymentResponse>>builder()
                .result(supplierPaymentService.getPaymentHistoryByImportOrder(id, page, size))
                .message("Lấy lịch sử thanh toán đơn nhập hàng thành công")
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<ImportOrderListItemResponse> updateImportOrder(
            @PathVariable Integer id,
            @Valid @RequestBody CreateImportOrderRequest request
    ) {
        return ApiResponse.<ImportOrderListItemResponse>builder()
                .result(importOrderService.updateImportOrder(id, request))
                .message("Cập nhật phiếu nhập hàng thành công")
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> cancelDraftImportOrder(@PathVariable Integer id) {
        importOrderService.cancelDraftImportOrder(id);
        return ApiResponse.<Void>builder()
                .message("Đã hủy phiếu tạm thành công")
                .build();
    }
}
