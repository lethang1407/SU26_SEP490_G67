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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_order_id", nullable = false)
    private ImportOrder importOrder;

    @Column(name = "return_code", length = 30)
    private String returnCode;

    @ColumnDefault("0.00")
    @Column(name = "total_refund", precision = 15, scale = 2)
    private BigDecimal totalRefund;

    @Lob
    @Column(name = "note")
    private String note;

    @OneToMany(mappedBy = "importReturn")
    private Set<ImportReturnDetail> importReturnDetails = new LinkedHashSet<>();


}