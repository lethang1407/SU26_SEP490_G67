package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @ColumnDefault("0.00")
    @Column(name = "total_debt", precision = 15, scale = 2)
    private BigDecimal totalDebt;

    @ColumnDefault("0.00")
    @Column(name = "total_paid", precision = 15, scale = 2)
    private BigDecimal totalPaid;

    @OneToMany(mappedBy = "customer")
    private Set<DebtPayment> debtPayments = new LinkedHashSet<>();

    @OneToMany(mappedBy = "customer")
    private Set<SalesOrder> salesOrders = new LinkedHashSet<>();


}