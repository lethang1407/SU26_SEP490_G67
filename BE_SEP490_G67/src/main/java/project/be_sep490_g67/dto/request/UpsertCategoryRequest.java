package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpsertCategoryRequest {

    @NotBlank(message = "Vui lòng nhập tên danh mục")
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;
}
