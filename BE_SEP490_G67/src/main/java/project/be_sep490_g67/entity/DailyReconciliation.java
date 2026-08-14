package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "daily_reconciliations")
public class DailyReconciliation extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "reconciliation_date", nullable = false, unique = true)
    private LocalDate reconciliationDate;

    @ColumnDefault("0.00")
    @Column(name = "opening_cash", precision = 15, scale = 2)
    private BigDecimal openingCash;

    @ColumnDefault("0.00")
    @Column(name = "cash_sales", precision = 15, scale = 2)
    private BigDecimal cashSales;

    @ColumnDefault("0.00")
    @Column(name = "cash_debt_collected", precision = 15, scale = 2)
    private BigDecimal cashDebtCollected;

    @ColumnDefault("0.00")
    @Column(name = "cash_refunded", precision = 15, scale = 2)
    private BigDecimal cashRefunded;

    @ColumnDefault("0.00")
    @Column(name = "theoretical_cash", precision = 15, scale = 2)
    private BigDecimal theoreticalCash;

    @ColumnDefault("0.00")
    @Column(name = "actual_cash", precision = 15, scale = 2)
    private BigDecimal actualCash;

    @ColumnDefault("0.00")
    @Column(name = "cash_discrepancy", precision = 15, scale = 2)
    private BigDecimal cashDiscrepancy;

    @ColumnDefault("0.00")
    @Column(name = "bank_transfer_confirmed", precision = 15, scale = 2)
    private BigDecimal bankTransferConfirmed;

    @ColumnDefault("0.00")
    @Column(name = "bank_transfer_pending", precision = 15, scale = 2)
    private BigDecimal bankTransferPending;

    @ColumnDefault("0.00")
    @Column(name = "bank_actual", precision = 15, scale = 2)
    private BigDecimal bankActual;

    @ColumnDefault("0.00")
    @Column(name = "bank_discrepancy", precision = 15, scale = 2)
    private BigDecimal bankDiscrepancy;

    @ColumnDefault("'COMPLETED'")
    @Column(name = "status", length = 20)
    private String status;

    @Lob
    @Column(name = "note")
    private String note;
}
