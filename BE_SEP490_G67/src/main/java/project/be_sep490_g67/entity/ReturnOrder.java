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

    @Column(name = "return_code", length = 30)
    private String returnCode;

    @Lob
    @Column(name = "return_reason")
    private String returnReason;

    @Lob
    @Column(name = "resolution_type")
    private String resolutionType;

    /** Tổng giá trị hàng khách trả về, trước khi chia thành cấn trừ nợ và tiền mặt. */
    @ColumnDefault("0.00")
    @Column(name = "refund_amount", precision = 15, scale = 2)
    private BigDecimal refundAmount;

    /**
     * Phần {@link #refundAmount} được trừ thẳng vào công nợ của hoá đơn gốc thay vì
     * trả bằng tiền. Chỉ khác 0 khi đơn gốc là đơn nợ và còn dư nợ.
     * NULL với phiếu lập
     */
    @Column(name = "debt_offset_amount", precision = 15, scale = 2)
    private BigDecimal debtOffsetAmount;

    /**
     * Phần {@link #refundAmount} thực sự ra khỏi két. Với đơn nợ, đây là phần còn lại
     * sau khi đã cấn trừ hết công nợ — nên nó không bao giờ vượt quá số tiền khách đã
     * thực trả cho hoá đơn gốc. NULL với phiếu lập trước V25.
     */
    @Column(name = "cash_refund_amount", precision = 15, scale = 2)
    private BigDecimal cashRefundAmount;

    @Lob
    @Column(name = "note")
    private String note;

    @OneToMany(mappedBy = "returnOrder")
    private Set<ReturnOrderDetail> returnOrderDetails = new LinkedHashSet<>();


}