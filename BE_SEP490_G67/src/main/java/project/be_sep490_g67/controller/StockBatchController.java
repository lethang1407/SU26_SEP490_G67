package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CancelStockBatchRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.CancelStockBatchResponse;
import project.be_sep490_g67.service.StockBatchService;

@RestController
@RequestMapping(ApiPath.STOCK_BATCHES)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StockBatchController {

    StockBatchService stockBatchService;

    @PostMapping("/{id}/cancel")
    public ApiResponse<CancelStockBatchResponse> cancelBatch(
            @PathVariable("id") Integer id,
            @Valid @RequestBody CancelStockBatchRequest request) {
        return ApiResponse.<CancelStockBatchResponse>builder()
                .result(stockBatchService.cancelBatch(id, request.getQuantity()))
                .message("Hủy lô thành công")
                .build();
    }
}
