package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "return_order_details")
public class ReturnOrderDetail extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "return_order_id", nullable = false)
    private ReturnOrder returnOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_detail_id")
    private SalesOrderDetail salesOrderDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "product_unit_id")
    private ProductUnit productUnit;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_name", length = 50)
    private String unitName;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_refund", precision = 15, scale = 2)
    private BigDecimal lineRefund;

    @Column(name = "resolution_type", length = 20, nullable = false)
    private String resolutionType;

    @Column(name = "item_condition", length = 20, nullable = false)
    private String itemCondition;

    /** Lý do trả của riêng dòng này (cận date, bao bì móp, khách đổi ý...). */
    @Column(name = "note", length = 500)
    private String note;
}