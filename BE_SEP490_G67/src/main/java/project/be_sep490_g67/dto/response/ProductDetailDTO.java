package project.be_sep490_g67.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class ProductDetailDTO {
    private Integer id;
    private String name;
    private String sku;
    private String barcode;
    private Integer categoryId;
    private String categoryName;
    private String brand;
    private String description;
    private String status;
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private BigDecimal vatPercent;
    private String seasonTag;
    private Integer coverDaysOverride;
    private String productImg;
    private String baseUnitName;

    @Builder.Default
    private List<UnitDTO> units = new ArrayList<>();

    @Builder.Default
    private List<AttributeDTO> attributes = new ArrayList<>();

    @Builder.Default
    private List<ImageDTO> images = new ArrayList<>();

    @Data
    @Builder
    public static class UnitDTO {
        private Integer id;
        private String name;
        private BigDecimal unitBase;
        private BigDecimal sellingPrice;
        @JsonProperty("isBase")
        private boolean isBase;
    }

    @Data
    @Builder
    public static class AttributeDTO {
        private Integer id;
        private String name;
        private String value;
    }

    @Data
    @Builder
    public static class ImageDTO {
        private Integer id;
        private String url;
        private String publicId;
        @JsonProperty("isMain")
        private boolean isMain;
        private Integer sortOrder;
    }
}
