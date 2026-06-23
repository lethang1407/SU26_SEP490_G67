package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tax_records")
public class TaxRecord extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "taxable_revenue", precision = 15, scale = 2)
    private BigDecimal taxableRevenue;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(name = "tax_amount_payable", precision = 15, scale = 2)
    private BigDecimal taxAmountPayable;

    @ColumnDefault("0.00")
    @Column(name = "tax_amount_paid", precision = 15, scale = 2)
    private BigDecimal taxAmountPaid;

    @ColumnDefault("'UNPAID'")
    @Column(name = "payment_status", length = 30)
    private String paymentStatus;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Lob
    @Column(name = "notes")
    private String notes;

}