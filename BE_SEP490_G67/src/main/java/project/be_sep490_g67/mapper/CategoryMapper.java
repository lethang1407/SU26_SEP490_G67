package project.be_sep490_g67.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.entity.Category;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    @Mapping(target = "productCount", ignore = true)
    CategoryResponse toCategoryResponse(Category category);
}
