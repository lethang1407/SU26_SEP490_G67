package project.be_sep490_g67.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class UpsertProductRequest {

    @NotBlank(message = "Vui lòng nhập tên sản phẩm")
    @Size(max = 200)
    private String name;

    private Integer parentId;

    @Size(max = 50)
    private String sku;

    @Size(max = 50)
    private String barcode;

    @NotNull(message = "Vui lòng chọn danh mục")
    private Integer categoryId;

    @Size(max = 100)
    private String brand;

    private String description;

    /** active | inactive */
    private String status = "active";

    private BigDecimal costPrice = BigDecimal.ZERO;

    private BigDecimal sellingPrice = BigDecimal.ZERO;

    private BigDecimal vatPercent = new BigDecimal("10");

    private String seasonTag;

    private Integer coverDaysOverride;

    @Valid
    private List<UnitRequest> units = new ArrayList<>();

    @Valid
    private List<AttributeRequest> attributes = new ArrayList<>();

    @Valid
    private List<VariantRequest> variants = new ArrayList<>();

    @Data
    public static class UnitRequest {
        @NotBlank
        @Size(max = 50)
        private String name;

        @NotNull
        private BigDecimal unitBase;

        private BigDecimal sellingPrice;

        @JsonProperty("isBase")
        private Boolean isBase = false;
    }

    @Data
    public static class AttributeRequest {
        @NotBlank
        @Size(max = 60)
        private String name;

        @NotBlank
        private String value;
    }

    @Data
    public static class VariantRequest {
        private Integer id;
        private String name;
        private String sku;
        private String barcode;
        private BigDecimal costPrice;
        private BigDecimal sellingPrice;
        private String status;
        private List<AttributeRequest> attributes = new ArrayList<>();
    }
}
