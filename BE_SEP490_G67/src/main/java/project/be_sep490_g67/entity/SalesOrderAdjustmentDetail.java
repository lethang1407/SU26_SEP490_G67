package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "sales_order_adjustment_details")
public class SalesOrderAdjustmentDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adjustment_id", nullable = false)
    private SalesOrderAdjustment salesOrderAdjustment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "original_quantity", nullable = false)
    private Integer originalQuantity;

    @Column(name = "adjusted_quantity", nullable = false)
    private Integer adjustedQuantity;

    @Column(name = "original_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal originalPrice;

    @Column(name = "adjusted_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal adjustedPrice;
}
