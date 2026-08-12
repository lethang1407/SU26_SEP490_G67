package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "sales_orders")
public class SalesOrder extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "order_code", length = 30)
    private String orderCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exchange_sales_order_id")
    private SalesOrder exchangeSalesOrder;

    @ColumnDefault("'CASH'")
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @ColumnDefault("'COMPLETED'")
    @Column(name = "order_status", length = 50)
    private String orderStatus;

    @ColumnDefault("0.00")
    @Column(name = "subtotal", precision = 15, scale = 2)
    private BigDecimal subtotal;

    @ColumnDefault("0.00")
    @Column(name = "paid_amount", precision = 15, scale = 2)
    private BigDecimal paidAmount;

    @ColumnDefault("0.00")
    @Column(name = "discount_amount", precision = 15, scale = 2)
    private BigDecimal discountAmount;

    @ColumnDefault("0.00")
    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @ColumnDefault("0")
    @Column(name = "is_debt")
    private Boolean isDebt;

    @ColumnDefault("0")
    @Column(name = "is_check_unstable_debt")
    private Boolean isCheckDebtUnstable;

    @Lob
    @Column(name = "note")
    private String note;

    @Column(name = "due_date")
    private Instant dueDate;

    @OneToMany(mappedBy = "salesOrder")
    private Set<DebtPayment> debtPayments = new LinkedHashSet<>();

    @OneToMany(mappedBy = "salesOrder")
    private Set<ReturnOrder> returnOrders = new LinkedHashSet<>();

    @OneToMany(mappedBy = "salesOrder")
    private Set<SalesOrderDetail> salesOrderDetails = new LinkedHashSet<>();

}