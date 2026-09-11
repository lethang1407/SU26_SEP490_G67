package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockMovement;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Integer> {

    @Query("""
        SELECT COALESCE(SUM(sm.quantityDelta), 0)
        FROM StockMovement sm
        WHERE sm.stockBatch.id = :batchId
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    int sumQuantityDeltaByBatchId(@Param("batchId") Integer batchId);

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.stockBatch.id = :batchId
          AND sm.referenceType = :referenceType
          AND sm.referenceId = :referenceId
          AND sm.movementType = :movementType
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    List<StockMovement> findActiveByBatchReferenceAndType(
            @Param("batchId") Integer batchId,
            @Param("referenceType") String referenceType,
            @Param("referenceId") Integer referenceId,
            @Param("movementType") String movementType
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.referenceType = :referenceType
          AND sm.referenceId = :referenceId
          AND sm.movementType = :movementType
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    List<StockMovement> findActiveByReferenceAndType(
            @Param("referenceType") String referenceType,
            @Param("referenceId") Integer referenceId,
            @Param("movementType") String movementType
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        JOIN FETCH sm.stockBatch sb
        JOIN FETCH sb.product p
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType IN :types
          AND (:fromInstant IS NULL OR sm.createdAt >= :fromInstant)
          AND (:toInstant IS NULL OR sm.createdAt < :toInstant)
          AND (:productIdsEmpty = true OR p.id IN :productIds)
        ORDER BY p.name ASC, p.id ASC, sm.createdAt ASC, sm.id ASC
        """)
    List<StockMovement> findReportMovements(
            @Param("fromInstant") Instant fromInstant,
            @Param("toInstant") Instant toInstant,
            @Param("types") Collection<String> types,
            @Param("productIds") Collection<Integer> productIds,
            @Param("productIdsEmpty") boolean productIdsEmpty
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        JOIN FETCH sm.stockBatch sb
        JOIN FETCH sb.product p
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType IN :types
          AND sm.createdAt < :before
          AND (:productIdsEmpty = true OR p.id IN :productIds)
        ORDER BY p.id ASC, sm.createdAt ASC, sm.id ASC
        """)
    List<StockMovement> findMovementsBefore(
            @Param("before") Instant before,
            @Param("types") Collection<String> types,
            @Param("productIds") Collection<Integer> productIds,
            @Param("productIdsEmpty") boolean productIdsEmpty
    );
}
