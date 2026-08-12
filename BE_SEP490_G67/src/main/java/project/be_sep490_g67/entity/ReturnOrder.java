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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id")
    private SalesOrder salesOrder;

    @Column(name = "bearer_name", length = 100)
    private String bearerName;

    @Column(name = "bearer_phone", length = 15)
    private String bearerPhone;

    @Column(name = "bearer_is_owner")
    private Boolean bearerIsOwner;

    @Column(name = "approved_by")
    private Integer approvedBy;

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