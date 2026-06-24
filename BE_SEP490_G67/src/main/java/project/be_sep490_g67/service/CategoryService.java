package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CategoryRequest;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Category;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.mapper.CategoryMapper;
import project.be_sep490_g67.repository.CategoryRepository;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CategoryService {

    CategoryRepository categoryRepository;
    CategoryMapper categoryMapper;

    // View all category
    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> findAllCategory(
            String search,
            int page,
            int size) {

        Page<Category> result =
                categoryRepository.findAllCategory(
                        search,
                        PageRequest.of(page, size));

        return PageResponse.<CategoryResponse>builder()
                .content(
                        result.getContent()
                                .stream()
                                .map(categoryMapper::toCategoryResponse)
                                .toList()
                )
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    // Create new category
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request){
        Category category = new Category();
        category.setName(request.getName().trim());
        category.setDescription(request.getDescription());

        Category newCategory = categoryRepository.save(category);
        log.info("Created category with id {}", category.getId());
        return categoryMapper.toCategoryResponse(newCategory);
    }

    // Update category
    @Transactional
    public CategoryResponse updateCategory(
            CategoryRequest request,
            Integer categoryId) {

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.NOT_FOUND_CATEGORY));

        String name = request.getName().trim();

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, categoryId)) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS);
        }

        category.setName(name);
        category.setDescription(
                request.getDescription() == null
                        ? null
                        : request.getDescription()
        );

        categoryRepository.save(category);
        log.info("Updated category with id {}", categoryId);

        return categoryMapper.toCategoryResponse(category);
    }
}
