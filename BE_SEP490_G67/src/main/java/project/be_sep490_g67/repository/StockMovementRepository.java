package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockMovement;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Integer> {
    @Query("""
        SELECT COALESCE(SUM(sm.quantityDelta), 0)
        FROM StockMovement sm
        WHERE sm.stockBatch.id = :batchId
        """)
    int sumQuantityDeltaByBatchId(@Param("batchId") Integer batchId);
}
