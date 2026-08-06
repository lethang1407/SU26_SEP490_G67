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
            SELECT sb.product.id, COALESCE(SUM(sb.quantityIn), 0)
            FROM StockBatch sb
            WHERE sb.product.id IN :productIds
              AND sb.isRemoved = false
            GROUP BY sb.product.id
            """)
    List<Object[]> sumStockByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("""
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            WHERE sb.isRemoved = false
              AND COALESCE(sb.quantityIn, 0) > (
                  SELECT COALESCE(SUM(bl.quantity), 0)
                  FROM BatchLocation bl
                  WHERE bl.batch.id = sb.id
                    AND bl.isRemoved = false
              )
            ORDER BY sb.receivedDate ASC, sb.id ASC
            """)
    List<StockBatch> findUnplacedBatches();

    @Query("""
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            WHERE sb.id = :id
              AND sb.isRemoved = false
            """)
    Optional<StockBatch> findActiveWithProductById(@Param("id") Integer id);

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

    /**
     * Số thứ tự lớn nhất trong ngày cho mã lô dạng LddMMyy-xx.
     * dayPrefix ví dụ: L050826
     */
    @Query(value = """
            SELECT MAX(CAST(SUBSTRING(batch_code, LOCATE('-', batch_code) + 1) AS UNSIGNED))
            FROM stock_batches
            WHERE batch_code LIKE CONCAT(:dayPrefix, '-%')
            """, nativeQuery = true)
    Integer findMaxBatchSequenceByDayPrefix(@Param("dayPrefix") String dayPrefix);
}
