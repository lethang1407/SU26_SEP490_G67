package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/**
 * Ngưỡng phân loại của dashboard — bảng một dòng, tách khỏi {@link StoreConfig} ở V56.
 *
 * <p>{@link StoreConfig} là hồ sơ cửa hàng (tên, mã số thuế, ngân hàng, chính sách đổi trả);
 * các ngưỡng ở đây chỉ quyết định màu và thứ hạng trên dashboard.
 *
 * <p>Chưa có màn hình sửa: muốn đổi thì cập nhật thẳng trong DB. Thiếu dòng thì các
 * service lấy giá trị mặc định trong code — trùng với {@code DEFAULT} của cột.
 */
@Getter
@Setter
@Entity
@Table(name = "alert_threshold_config")
public class AlertThresholdConfig extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    /** Bán từ mức này trở lên trong {@link #highVolumeWindowDays} ngày thì coi là bán chạy. */
    @ColumnDefault("30")
    @Column(name = "high_volume_sold_units", nullable = false)
    private Integer highVolumeSoldUnits;

    @ColumnDefault("30")
    @Column(name = "high_volume_window_days", nullable = false)
    private Integer highVolumeWindowDays;

    /**
     * Hàng nằm chờ trong khu đổi trả quá số ngày này thì nâng từ vàng lên cam.
     */
    @ColumnDefault("7")
    @Column(name = "return_hold_orange_days", nullable = false)
    private Integer returnHoldOrangeDays;

    @ColumnDefault("14")
    @Column(name = "return_hold_red_days", nullable = false)
    private Integer returnHoldRedDays;

    /**
     * Sàn để tách "cần xem xét" khỏi "bán chậm" ở widget quyết định nhập hàng.
     * Bán dưới mức này trong kỳ thì tồn thấp cũng không thúc nhập.
     * Đơn vị: đơn vị cơ sở của sản phẩm.
     */
    @ColumnDefault("5")
    @Column(name = "slow_moving_sold_units", nullable = false)
    private Integer slowMovingSoldUnits;

    /**
     * Số dòng widget quyết định nhập hàng hiện trên dashboard.
     */
    @ColumnDefault("5")
    @Column(name = "restock_advice_preview_limit", nullable = false)
    private Integer restockAdvicePreviewLimit;

    /**
     * Hạn đổi trả tính theo ngày sau ngày mua (giờ VN), chuyển từ store_config ở V57.
     * Khác các trường còn lại: đây là chính sách đổi trả, không phải ngưỡng dashboard.
     *
     * <p>{@code null} = không đặt hạn (đổi trả lúc nào cũng được), {@code 0} = chỉ trong
     * ngày mua. Vì {@code null} có nghĩa riêng nên cột này KHÔNG có {@code nullable = false}.
     */
    @ColumnDefault("7")
    @Column(name = "return_window_days")
    private Integer returnWindowDays;
}
