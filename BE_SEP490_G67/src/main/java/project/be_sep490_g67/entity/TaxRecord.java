package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.enums.TaxRecordStatus;
import project.be_sep490_g67.enums.TaxDeclarationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Bản tính nghĩa vụ thuế của một hồ sơ năm.
 * Lưu riêng doanh thu, thuế GTGT và thuế TNCN để có thể giải trình công thức,
 * phiên bản pháp lý và lần xác nhận; không phải là dòng doanh thu kế toán.
 */
@Getter
@Setter
@Entity
@Table(name = "tax_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tax_record_profile_period", columnNames = {"profile_id", "period_type"})
})
public class TaxRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Mỗi hồ sơ năm có một bản ghi YEAR trong phạm vi hiện tại. */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private BusinessTaxProfile profile;

    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", nullable = false, length = 20)
    private TaxPeriodType periodType = TaxPeriodType.YEAR;

    @Column(name = "revenue_base", nullable = false, precision = 19, scale = 2)
    private BigDecimal revenueBase = BigDecimal.ZERO;

    @Column(name = "revenue_threshold", nullable = false, precision = 19, scale = 2)
    private BigDecimal revenueThreshold = BigDecimal.ZERO;

    @Column(name = "vat_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Column(name = "pit_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal pitRate = BigDecimal.ZERO;

    @Column(name = "vat_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "pit_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal pitAmount = BigDecimal.ZERO;

    @Column(name = "total_tax_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalTaxAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TaxRecordStatus status = TaxRecordStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "declaration_status", nullable = false, length = 20)
    private TaxDeclarationStatus declarationStatus = TaxDeclarationStatus.UPDATING;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "calculated_at")
    private Instant calculatedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "legal_version", length = 100)
    private String legalVersion;

    @Column(name = "template_version", length = 100)
    private String templateVersion;

    @Version
    @Column(nullable = false)
    private Long version = 0L;
}
