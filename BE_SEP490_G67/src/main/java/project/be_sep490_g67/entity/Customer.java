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

    @Column(name = "customer_code", unique = true, length = 20)
    private String customerCode;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "address")
    private String address;

    @ColumnDefault("1")
    @Column(name = "is_debt")
    private Boolean isDebt = true;

    @Lob
    @Column(name = "note")
    private String note;

    @ColumnDefault("0.00")
    @Column(name = "total_debt", precision = 15, scale = 2)
    private BigDecimal totalDebt;

    @OneToMany(mappedBy = "customer")
    private Set<DebtPayment> debtPayments = new LinkedHashSet<>();

    @OneToMany(mappedBy = "customer")
    private Set<SalesOrder> salesOrders = new LinkedHashSet<>();


}