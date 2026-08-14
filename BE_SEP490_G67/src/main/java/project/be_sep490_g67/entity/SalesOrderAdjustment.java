package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "sales_order_adjustments")
public class SalesOrderAdjustment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @Column(name = "adjustment_code", length = 30, nullable = false)
    private String adjustmentCode;

    @Column(name = "adjustment_type", length = 50, nullable = false)
    private String adjustmentType;

    @Column(name = "original_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal originalAmount;

    @Column(name = "adjusted_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal adjustedAmount;

    @Column(name = "difference_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal differenceAmount;

    @Column(name = "refund_method", length = 50)
    private String refundMethod;

    @Column(name = "reason", length = 255, nullable = false)
    private String reason;

    @OneToMany(mappedBy = "salesOrderAdjustment", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<SalesOrderAdjustmentDetail> details = new LinkedHashSet<>();
}
