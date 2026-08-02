package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "products")
public class Product extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "barcode", length = 50)
    private String barcode;

    @Column(name = "sku", length = 50, unique = true)
    private String sku;

    @Column(name = "brand", length = 100)
    private String brand;

    @ColumnDefault("10.00")
    @Column(name = "vat_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal vatPercent = new BigDecimal("10.00");

    @ColumnDefault("0.00")
    @Column(name = "cost_price", precision = 15, scale = 2)
    private BigDecimal costPrice;

    @ColumnDefault("0.00")
    @Column(name = "selling_price", precision = 15, scale = 2)
    private BigDecimal sellingPrice;

    @ColumnDefault("0")
    @Column(name = "min_stock")
    private Integer minStock;

    @Column(name = "description")
    private String description;

    @Column(name = "product_img", length = 500)
    private String productImg;

    /** active | inactive (ngừng bán) */
    @ColumnDefault("'active'")
    @Column(name = "status", length = 20, nullable = false)
    private String status = "active";

    /** Tag mùa lễ: Tết, Trung thu… — null = không phải hàng mùa */
    @Column(name = "season_tag", length = 50)
    private String seasonTag;

    /** Cài riêng “đủ bán (ngày)” — null = theo nhóm */
    @Column(name = "cover_days_override")
    private Integer coverDaysOverride;

    @OneToMany(mappedBy = "product")
    private Set<ImportOrderDetail> importOrderDetails = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<ImportReturnDetail> importReturnDetails = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<ProductAttribute> productAttributes = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<ProductUnit> productUnits = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<ProductImage> productImages = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<ReturnOrderDetail> returnOrderDetails = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<SalesOrderDetail> salesOrderDetails = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<StockAdjustment> stockAdjustments = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product")
    private Set<StockBatch> stockBatches = new LinkedHashSet<>();

}