package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "import_orders")
public class ImportOrder extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "order_code", length = 30)
    private String orderCode;

    @ColumnDefault("0.00")
    @Column(name = "total_cost", precision = 15, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    /**
     * DRAFT | IMPORTED — không default; gán tường minh khi tạo/xác nhận đơn
     * (hoặc cập nhật thủ công cho dữ liệu cũ).
     */
    @Column(name = "order_status", length = 20)
    private String orderStatus;

    @Lob
    @Column(name = "note")
    private String note;
    
    @OneToMany(mappedBy = "importOrder")
    private Set<ImportOrderDetail> importOrderDetails = new LinkedHashSet<>();

    @OneToMany(mappedBy = "importOrder")
    private Set<ImportReturn> importReturns = new LinkedHashSet<>();

    @OneToMany(mappedBy = "importOrder")
    private Set<StockBatch> stockBatches = new LinkedHashSet<>();

    @OneToMany(mappedBy = "importOrder")
    private List<SupplierPayment> payments;
}