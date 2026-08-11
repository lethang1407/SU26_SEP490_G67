package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "import_return_details")
public class ImportReturnDetail extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "import_return_id", nullable = false)
    private ImportReturn importReturn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_batch_id")
    private StockBatch stockBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_order_id")
    private ImportOrder importOrder;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "return_price", precision = 15, scale = 2)
    private BigDecimal returnPrice;

    @Column(name = "return_reason")
    private String returnReason;

    /** RETURN | EXCHANGE */
    @Column(name = "method", length = 20, nullable = false)
    private String method = "RETURN";

    /** WAITING_SUPPLIER | DONE */
    @Column(name = "line_status", length = 30, nullable = false)
    private String lineStatus = "WAITING_SUPPLIER";

    @Column(name = "note", length = 500)
    private String note;

    /** Đã trừ tồn khi lưu nháp. */
    @Column(name = "stock_reserved", nullable = false)
    private Boolean stockReserved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exchange_batch_id")
    private StockBatch exchangeBatch;
}
