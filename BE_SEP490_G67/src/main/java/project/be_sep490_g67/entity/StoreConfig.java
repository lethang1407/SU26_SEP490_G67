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
public class StoreConfig extends BaseEntity{
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

    @ColumnDefault("7")
    @Column(name = "return_window_days")
    private Integer returnWindowDays;

    /**
     * Ngưỡng leo thang mức độ nghiêm trọng của thẻ "Kho hàng" trên dashboard. Mức mặc
     * định chỉ là điểm khởi đầu — admin chỉnh được mà không cần deploy lại.
     *
     * <p>SP hết hàng bán được từ {@code highVolumeSoldUnits} đơn vị trở lên trong
     * {@code highVolumeWindowDays} ngày gần nhất thì nâng từ cam lên đỏ.
     */
    @ColumnDefault("30")
    @Column(name = "high_volume_sold_units", nullable = false)
    private Integer highVolumeSoldUnits;

    @ColumnDefault("30")
    @Column(name = "high_volume_window_days", nullable = false)
    private Integer highVolumeWindowDays;

    /** Hàng nằm chờ trong khu đổi trả quá số ngày này thì nâng từ vàng lên cam. */
    @ColumnDefault("7")
    @Column(name = "return_hold_orange_days", nullable = false)
    private Integer returnHoldOrangeDays;

    /** …và quá số ngày này thì lên đỏ. */
    @ColumnDefault("14")
    @Column(name = "return_hold_red_days", nullable = false)
    private Integer returnHoldRedDays;
}