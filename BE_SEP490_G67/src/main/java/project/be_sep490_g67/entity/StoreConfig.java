package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "store_config")
public class StoreConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ColumnDefault("'Cửa hàng Đức Thắng'")
    @Column(name = "store_name", nullable = false, length = 200)
    private String storeName;

    @Column(name = "owner_full_name", length = 100)
    private String ownerFullName;

    @Column(name = "address")
    private String address;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @ColumnDefault("10.00")
    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;

    @ColumnDefault("'VND'")
    @Column(name = "currency", length = 10)
    private String currency;

    @ColumnDefault("0")
    @Column(name = "is_removed", nullable = false)
    private Boolean isRemoved;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private Instant createdAt;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "updated_by")
    private Integer updatedBy;


}