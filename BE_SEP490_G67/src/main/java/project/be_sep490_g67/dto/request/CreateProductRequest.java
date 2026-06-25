package project.be_sep490_g67.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateProductRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    String name;

    String sku;

    String barcode;

    @NotBlank(message = "Danh mục không được để trống")
    String category;

    String brand;

    String description;

    @NotBlank(message = "Giá nhập không được để trống")
    String importPrice;

    @NotBlank(message = "Giá bán không được để trống")
    String sellPrice;

    String vat;

    Boolean isActive;

    String productImg;

    List<ProductAttributeRequest> attributes;
}
