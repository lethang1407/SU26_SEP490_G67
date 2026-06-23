package project.be_sep490_g67.mapper;

import org.mapstruct.Mapper;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.entity.Category;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryResponse toCategoryResponse(Category category);
}