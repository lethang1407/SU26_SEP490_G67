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
@Table(name = "import_returns")
public class ImportReturn extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    /** Có thể null với phiếu trả đa NCC / nháp. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_order_id")
    private ImportOrder importOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "return_code", length = 30)
    private String returnCode;

    @ColumnDefault("'COMPLETED'")
    @Column(name = "status", length = 20)
    private String status;

    /** MANUAL | INVENTORY_CHECK */
    @ColumnDefault("'MANUAL'")
    @Column(name = "source", length = 30, nullable = false)
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_check_id")
    private InventoryCheck inventoryCheck;

    @ColumnDefault("0.00")
    @Column(name = "total_refund", precision = 15, scale = 2)
    private BigDecimal totalRefund;

    @Lob
    @Column(name = "note")
    private String note;

    @OneToMany(mappedBy = "importReturn")
    private Set<ImportReturnDetail> importReturnDetails = new LinkedHashSet<>();
}
