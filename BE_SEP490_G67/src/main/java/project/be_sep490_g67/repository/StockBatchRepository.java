package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.StockBatch;

import java.util.List;

public interface StockBatchRepository extends JpaRepository<StockBatch, Integer> {

    /**
     * Fetch active (non-removed) stock batches for a product that still have remaining inventory.
     */
    @Query("""
        SELECT sb FROM StockBatch sb
        WHERE sb.product.id = :productId
          AND sb.isRemoved = false
          AND sb.quantityIn > 0
        ORDER BY sb.receivedDate ASC
        """)
    List<StockBatch> findAvailableByProductId(@Param("productId") Integer productId);

    @Query("""
            SELECT sb.product.id, COALESCE(SUM(sb.quantityIn), 0)
            FROM StockBatch sb
            WHERE sb.product.id IN :productIds
              AND sb.isRemoved = false
            GROUP BY sb.product.id
            """)
    List<Object[]> sumStockByProductIds(@Param("productIds") List<Integer> productIds);
}
