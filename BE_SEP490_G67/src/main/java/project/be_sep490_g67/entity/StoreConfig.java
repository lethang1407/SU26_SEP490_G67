package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "store_config")
public class StoreConfig extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ColumnDefault("'Cửa hàng tạp hóa Đức Thắng'")
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

    /**
     * Tài khoản thụ hưởng in lên ảnh VietQR ở màn hình bán hàng.
     */
    @Column(name = "bank_id", length = 20)
    private String bankId;

    @Column(name = "bank_account_no", length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name", length = 100)
    private String bankAccountName;
}