package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "import_trial_settlement_lines")
public class ImportTrialSettlementLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private ImportTrialSettlement settlement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_order_detail_id", nullable = false)
    private ImportOrderDetail importOrderDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_batch_id")
    private StockBatch stockBatch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "received_qty", nullable = false)
    private Integer receivedQty;

    @Column(name = "system_remaining_qty", nullable = false)
    private Integer systemRemainingQty;

    @Column(name = "counted_remaining_qty", nullable = false)
    private Integer countedRemainingQty;

    @ColumnDefault("0")
    @Column(name = "unsellable_qty", nullable = false)
    private Integer unsellableQty = 0;

    @ColumnDefault("0")
    @Column(name = "returned_qty", nullable = false)
    private Integer returnedQty = 0;

    @ColumnDefault("0")
    @Column(name = "payable_qty", nullable = false)
    private Integer payableQty = 0;

    @Column(name = "decision", nullable = false, length = 40)
    private String decision;

    @ColumnDefault("0.00")
    @Column(name = "cost_per_unit", precision = 15, scale = 2, nullable = false)
    private BigDecimal costPerUnit = BigDecimal.ZERO;

    @ColumnDefault("0.00")
    @Column(name = "payable_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal payableAmount = BigDecimal.ZERO;
}
