package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.StockBatch;

import java.util.List;
import java.util.Optional;

public interface StockBatchRepository extends JpaRepository<StockBatch, Integer> {

    @Query("""
        SELECT sb FROM StockBatch sb
        WHERE sb.product.id = :productId
          AND sb.isRemoved = false
          AND sb.quantityIn > 0
        ORDER BY sb.receivedDate ASC
        """)
    List<StockBatch> findAvailableByProductId(@Param("productId") Integer productId);

    @Query("""
    SELECT sb
    FROM StockBatch sb
    JOIN sb.stockMovements sm
    WHERE sb.product.id = :productId
      AND sb.isRemoved = false
      AND (sb.expiryDate IS NULL OR sb.expiryDate >= CURRENT_DATE)
    GROUP BY sb
    HAVING COALESCE(SUM(sm.quantityDelta), 0) > 0
    ORDER BY
        CASE WHEN sb.expiryDate IS NULL THEN 1 ELSE 0 END,
        sb.expiryDate ASC,
        sb.receivedDate ASC
    LIMIT 1
    """)
    Optional<StockBatch> findFirstAvailableBatchByProductId(Integer productId);
}
