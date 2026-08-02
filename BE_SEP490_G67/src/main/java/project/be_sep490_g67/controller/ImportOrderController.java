package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.request.ImportSuggestRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportOrderResponseDTO;
import project.be_sep490_g67.dto.response.ImportSuggestionDTO;
import project.be_sep490_g67.service.ImportOrderService;
import project.be_sep490_g67.service.ImportSuggestionService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.IMPORT_ORDER)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportOrderController {

    ImportSuggestionService importSuggestionService;
    ImportOrderService importOrderService;

    @PostMapping("/suggest")
    public ApiResponse<List<ImportSuggestionDTO>> suggest(@RequestBody ImportSuggestRequest request) {
        List<ImportSuggestionDTO> result = importSuggestionService.getSuggestions(request);
        return ApiResponse.<List<ImportSuggestionDTO>>builder()
                .result(result)
                .message("Gợi ý nhập hàng thành công")
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
