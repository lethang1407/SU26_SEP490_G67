package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.service.CategoryService;

@RestController
@RequestMapping(ApiPath.CATEGORY)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CategoryController {
    CategoryService categoryService;

    @GetMapping
    public ApiResponse<PageResponse<CategoryResponse>> getCategory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search
    ){
        PageResponse<CategoryResponse> listCategory = categoryService.findAllCategory(search, page, size);
        return ApiResponse.<PageResponse<CategoryResponse>>builder()
                .result(listCategory)
                .message("Lấy danh sách danh mục hàng hóa thành công")
                .build();
    }
}
