package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.*;


@Getter
@Setter
@Entity
@Table(name = "stock_movements")
@AllArgsConstructor
@NoArgsConstructor
@Builder

public class StockMovement extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_batch_id", nullable = false)
    private StockBatch stockBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_location_id")
    private BatchLocation batchLocation;

    @Column(name = "movement_type", length = 40)
    private String movementType;

    //SALE_ORDER, IMPORT_ORDER, ADJUSTMENT
    @Column(name = "reference_type", length = 40)
    private String referenceType;

    @Column(name = "reference_id")
    private Integer referenceId;

    @Column(name = "quantity_delta", nullable = false)
    private Integer quantityDelta;

    // IMPORT, SALE, ADJUSTMENT, RETURN
    @Column(name = "stock_after", nullable = false)
    private Integer stockAfter;

    // is_removed / created_at / created_by ... come from BaseEntity - do not
    // redeclare them here, it maps the same column twice.
}
