package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "return_orders")
public class ReturnOrder extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @Column(name = "return_code", length = 30)
    private String returnCode;

    @Lob
    @Column(name = "return_reason")
    private String returnReason;

    @Lob
    @Column(name = "resolution_type")
    private String resolutionType;

    @ColumnDefault("0.00")
    @Column(name = "refund_amount", precision = 15, scale = 2)
    private BigDecimal refundAmount;

    @Lob
    @Column(name = "note")
    private String note;

    @OneToMany(mappedBy = "returnOrder")
    private Set<ReturnOrderDetail> returnOrderDetails = new LinkedHashSet<>();


}