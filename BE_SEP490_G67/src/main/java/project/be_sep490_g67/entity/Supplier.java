package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "suppliers")
public class Supplier extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "address")
    private String address;

    @Lob
    @Column(name = "notes")
    private String notes;

    @Column(name = "supplier_code", nullable = false, length = 30)
    private String supplierCode;

    /** Ngày từ đặt → hàng về kệ */
    @ColumnDefault("3")
    @Column(name = "lead_time_days", nullable = false)
    private Integer leadTimeDays = 3;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "supplier_category",
            joinColumns = @JoinColumn(name = "supplier_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories;

    @OneToMany(mappedBy = "supplier")
    private Set<ImportOrder> importOrders = new LinkedHashSet<>();

    @OneToMany(mappedBy = "supplier")
    private List<SupplierPayment> payments;
}