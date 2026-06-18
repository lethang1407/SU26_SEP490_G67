package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Category;
import project.be_sep490_g67.mapper.CategoryMapper;
import project.be_sep490_g67.repository.CategoryRepository;
import project.be_sep490_g67.repository.UserRepository;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CategoryService {

    CategoryRepository categoryRepository;
    UserRepository userRepository;
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
}
