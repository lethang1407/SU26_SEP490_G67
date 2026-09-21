package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import project.be_sep490_g67.enums.PeriodStatus;

/**
 * Kỳ quản lý theo tháng thuộc một hồ sơ năm; mỗi tháng chỉ có một kỳ.
 * Khoảng [startAt,endExclusive) theo giờ Việt Nam; kỳ đầu có thể bắt đầu giữa tháng.
 * Báo cáo quý/năm tổng hợp kỳ tháng, không tạo kỳ/dòng trùng để lưu lại.
 * AccountingService tạo kỳ OPEN và kiểm tra phạm vi dưới khóa cửa hàng/hồ sơ/kỳ.
 * Đóng kỳ qua AccountingService sau khi kỳ kết thúc và đối chiếu đủ nguồn hệ thống.
 * Chưa hỗ trợ mở lại kỳ; trạng thái CLOSED được kiểm tra bởi các writer kế toán.
 */
@Getter
@Setter
@Entity
@Table(name = "accounting_periods", uniqueConstraints = {
    @UniqueConstraint(name = "uk_accounting_period_month", columnNames = {"profile_id", "accounting_month"})
})
public class AccountingPeriod extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private BusinessTaxProfile profile;

    /** Tháng 1–12 trong taxYear của hồ sơ; AccountingService và V67 kiểm tra phạm vi. */
    @Column(name = "accounting_month", nullable = false)
    private Integer accountingMonth;

    /** max(đầu tháng theo giờ Việt Nam, mốc theo dõi); không tạo kỳ trước mốc. */
    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    /** Đầu tháng kế tiếp theo giờ Việt Nam, lưu Instant UTC. */
    @Column(name = "end_exclusive", nullable = false)
    private Instant endExclusive;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PeriodStatus status = PeriodStatus.OPEN;

    @Version @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "closed_by")
    private Integer closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;
}
