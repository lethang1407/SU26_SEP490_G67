package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "stock_movements")
public class StockMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_batch_id", nullable = false)
    private StockBatch stockBatch;

    @Lob
    @Column(name = "movement_type")
    private String movementType;

    @Column(name = "reference_type", length = 40)
    private String referenceType;

    @Column(name = "reference_id")
    private Integer referenceId;

    @Column(name = "quantity_delta")
    private Integer quantityDelta;

    @Column(name = "stock_after")
    private Integer stockAfter;

    @ColumnDefault("0")
    @Column(name = "is_removed")
    private Boolean isRemoved;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at")
    private Instant createdAt;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "updated_by")
    private Integer updatedBy;


}