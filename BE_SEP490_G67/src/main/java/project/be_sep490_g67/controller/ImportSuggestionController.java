package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.GroupedSuggestionDTO;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.service.ImportSuggestionService;

@RestController
@RequestMapping("/api/import/suggestions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportSuggestionController {

    ImportSuggestionService importSuggestionService;

    @GetMapping
    public ApiResponse<PageResponse<GroupedSuggestionDTO>> getGroupedSuggestions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        PageResponse<GroupedSuggestionDTO> result = importSuggestionService.getGroupedSuggestions(
                status, categoryId, keyword, page, size
        );
        return ApiResponse.<PageResponse<GroupedSuggestionDTO>>builder()
                .result(result)
                .message("Lấy gợi ý nhập hàng dạng cây thành công")
                .build();
    }
}
