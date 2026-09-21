package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import project.be_sep490_g67.enums.SourceType;
import project.be_sep490_g67.enums.RevenueClassification;

/**
 * Dòng doanh thu kế toán thuộc một kỳ, lưu số tiền và thông tin truy về chứng từ nguồn.
 * Một chứng từ nguồn có tối đa một dòng trên toàn hệ thống, thuộc đúng một kỳ tháng.
 * Chi tiết mặt hàng tra từ chứng từ gốc; quý/năm tổng hợp các kỳ, không sao chép dòng.
 * AccountingService ghi từ chứng từ bán/trả trong cùng transaction; khóa kỳ và chống trùng nguồn.
 * Đây không còn là cam kết lưu trọn bản báo cáo bất biến (hồ sơ, chính sách, payload đã bỏ).
 */
@Getter
@Setter
@Entity
@Table(name = "accounting_revenue_lines", uniqueConstraints = {
    @UniqueConstraint(name = "uk_accounting_revenue_source", columnNames = {"source_type", "source_id"})
})
public class AccountingRevenueLine extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false)
    private AccountingPeriod period;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    /** Chỉ SALES_ORDER, RETURN_ORDER hoặc REVENUE_ADJUSTMENT. */
    private SourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private Integer sourceId;

    /** Digest/version nguồn tại lúc ghi dòng; không phải khóa ngoại. */
    @Column(name = "source_version", nullable = false, length = 128)
    private String sourceVersion;

    @Column(name = "source_code", length = 100)
    private String sourceCode;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "posting_date", nullable = false)
    private LocalDate postingDate;

    @Column(length = 1000) private
    String description;

    @Column(name = "signed_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal signedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RevenueClassification classification;

    @Column(name = "inclusion_reason", nullable = false, length = 1000)
    private String inclusionReason;

    /** Chỉ nhóm trình bày sổ, không tạo thêm dòng tổng để cộng lần nữa. */
    @Column(name = "book_group_key", length = 100)
    private String bookGroupKey;
}
