package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.UpsertCategoryRequest;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Category;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.CategoryRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CategoryService {

    CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> findAllCategory(String search, int page, int size) {
        Page<Category> result = categoryRepository.findAllCategory(
                search, PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name")));
        Map<Integer, Long> counts = loadProductCounts(result.getContent());

        return PageResponse.<CategoryResponse>builder()
                .content(result.getContent().stream().map(c -> toResponse(c, counts)).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional
    public CategoryResponse create(UpsertCategoryRequest request) {
        String name = requireName(request.getName());
        if (categoryRepository.existsByNameIgnoreCaseAndIsRemovedFalse(name)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTED);
        }

        Category category = new Category();
        category.setName(name);
        category.setDescription(blankToNull(request.getDescription()));
        category.setCoverDays(7);
        category.setIsRemoved(false);
        category = categoryRepository.save(category);
        return toResponse(category, Map.of());
    }

    @Transactional
    public CategoryResponse update(Integer id, UpsertCategoryRequest request) {
        Category category = categoryRepository.findByIdAndIsRemovedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        String name = requireName(request.getName());
        if (categoryRepository.existsByNameIgnoreCaseAndIdNotAndIsRemovedFalse(name, id)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTED);
        }

        category.setName(name);
        category.setDescription(blankToNull(request.getDescription()));
        category = categoryRepository.save(category);

        Map<Integer, Long> counts = loadProductCounts(List.of(category));
        return toResponse(category, counts);
    }

    private Map<Integer, Long> loadProductCounts(List<Category> categories) {
        Map<Integer, Long> counts = new HashMap<>();
        if (categories == null || categories.isEmpty()) {
            return counts;
        }
        List<Integer> ids = categories.stream().map(Category::getId).toList();
        for (Object[] row : categoryRepository.countProductsByCategoryIds(ids)) {
            counts.put((Integer) row[0], (Long) row[1]);
        }
        return counts;
    }

    private CategoryResponse toResponse(Category category, Map<Integer, Long> counts) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .productCount(counts.getOrDefault(category.getId(), 0L))
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new AppException(ErrorCode.CATEGORY_NAME_REQUIRED);
        }
        return name.trim();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
