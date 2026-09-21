package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import project.be_sep490_g67.enums.SourceType;
import project.be_sep490_g67.enums.RevenueClassification;
import project.be_sep490_g67.enums.AdjustmentStatus;

/**
 * Khoản doanh thu ngoài POS hoặc điều chỉnh có chứng từ. Liên kết hồ sơ và nguồn; sửa khoản đã duyệt bằng khoản đảo/điều chỉnh mới.
 * AccountingService quản lý nháp/duyệt/từ chối; chỉ khoản APPROVED có dòng sổ.
 * Khoản đã duyệt bất biến qua API, thay đổi bằng khoản CORRECTION mới liên kết khoản cũ.
 */
@Getter
@Setter
@Entity
@Table(name = "revenue_adjustments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_revenue_adjustment_request", columnNames = {"profile_id", "idempotency_key"})
})
public class RevenueAdjustment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private BusinessTaxProfile profile;

    /**
     * Kỳ bị ảnh hưởng bởi sai sót, nếu có; có thể thuộc năm trước nhưng phải cùng cửa hàng.
     * Không phải kỳ ghi sổ: kỳ ghi sổ nằm trên AccountingRevenueLine.period,
     * được xác định từ postingDate và phải thuộc profile của điều chỉnh.
     * NULL cho khoản bổ sung không liên quan kỳ trước; không bắt buộc nếu lỗi chưa từng được ghi vào kỳ.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_period_id")
    private AccountingPeriod relatedPeriod;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private SourceType sourceType;

    /** ID đa hình: service phải kiểm tra đúng nguồn, không giả lập foreign key tới một bảng. */
    @Column(name = "source_id")
    private Integer sourceId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    /** Ngày ghi sổ theo Asia/Ho_Chi_Minh, thuộc taxYear của profile.
     * Không tự đẩy sai sót kỳ đã đóng vào kỳ hiện tại; cần quy trình xử lý được chấp nhận. */
    @Column(name = "posting_date", nullable = false)
    private LocalDate postingDate;

    @Column(name = "signed_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal signedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RevenueClassification classification;

    @Column(name = "inclusion_reason", nullable = false, length = 1000)
    private String inclusionReason;

    @Lob @Column(columnDefinition = "LONGTEXT")
    private String evidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdjustmentStatus status = AdjustmentStatus.DRAFT;

    @Column(name = "approved_by")
    private Integer approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_adjustment_id")
    private RevenueAdjustment originalAdjustment;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Version @Column(nullable = false)
    private Long version = 0L;
}
