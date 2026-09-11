package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockBatch;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
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
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            LEFT JOIN FETCH sb.importOrder io
            LEFT JOIN FETCH io.supplier
            WHERE sb.id = :id
              AND sb.isRemoved = false
            """)
    Optional<StockBatch> findActiveWithProductAndImportById(@Param("id") Integer id);

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
    @Query("""
        SELECT MIN(b.expiryDate)
        FROM StockBatch b
        WHERE b.product.id = :productId
          AND b.expiryDate IS NOT NULL
          AND b.expiryDate >= :today
          AND (b.isRemoved = false OR b.isRemoved IS NULL)
        """)
    Optional<LocalDate> findNearestExpiry(
            @Param("productId") Integer productId,
            @Param("today") LocalDate today);


    /** Lô mới nhất của SP — dùng gợi ý đơn giá nhập (cost_per_unit đã là giá / ĐVT cơ bản). */
    Optional<StockBatch> findFirstByProduct_IdAndIsRemovedFalseOrderByReceivedDateDescIdDesc(Integer productId);

    @Query("""
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            LEFT JOIN FETCH sb.importOrder io
            LEFT JOIN FETCH io.supplier
            WHERE sb.isRemoved = false
              AND COALESCE(sb.quantityIn, 0) > 0
              AND sb.expiryDate IS NOT NULL
              AND sb.expiryDate < CURRENT_DATE
            ORDER BY sb.expiryDate ASC, sb.id ASC
            """)
    List<StockBatch> findExpiredWithStock();

    @Query("""
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            LEFT JOIN FETCH sb.importOrder io
            LEFT JOIN FETCH io.supplier
            WHERE sb.isRemoved = false
              AND COALESCE(sb.quantityIn, 0) > 0
              AND sb.expiryDate IS NOT NULL
              AND sb.expiryDate >= CURRENT_DATE
              AND sb.expiryDate <= :untilDate
            ORDER BY sb.expiryDate ASC, sb.id ASC
            """)
    List<StockBatch> findExpiringSoonWithStock(@Param("untilDate") java.time.LocalDate untilDate);

    @Query("""
            SELECT sb FROM StockBatch sb
            JOIN FETCH sb.product p
            LEFT JOIN FETCH sb.importOrder io
            LEFT JOIN FETCH io.supplier
            WHERE sb.product.id = :productId
              AND sb.isRemoved = false
              AND COALESCE(sb.quantityIn, 0) > 0
            ORDER BY sb.receivedDate ASC, sb.id ASC
            """)
    List<StockBatch> findAvailableWithImportByProductId(@Param("productId") Integer productId);

    /**
     * Lô đã quá hạn và vẫn còn hàng thật trên kệ — nguồn của lằn cảnh báo đỏ trên thẻ
     * "Kho hàng" và của danh sách chi tiết khi bấm vào.
     *
     * <p>Số lượng trả về là tổng {@code batch_location.quantity} của lô, tức hàng đang
     * thực sự nằm đâu đó trong kho, KHÔNG phải {@code quantityIn} (số đã nhập ban đầu,
     * không trừ phần đã bán) và cũng không phải tổng tồn của sản phẩm. Khu RETURN_HOLD
     * bị loại vì hàng ở đó đã là hàng chờ xử lý, đếm nữa là đếm hai lần.
     *
     * <p>Mỗi phần tử: [StockBatch, số lượng còn lại].
     */
    @Query("""
            SELECT sb, COALESCE(SUM(bl.quantity), 0)
            FROM StockBatch sb
            JOIN sb.product p
            JOIN BatchLocation bl ON bl.batch = sb AND bl.isRemoved = false
            JOIN bl.location loc
            JOIN loc.storageZone sz
            WHERE sb.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
              AND sb.expiryDate IS NOT NULL
              AND sb.expiryDate < :today
            GROUP BY sb, p
            HAVING COALESCE(SUM(bl.quantity), 0) > 0
            ORDER BY sb.expiryDate ASC, sb.id ASC
            """)
    List<Object[]> findExpiredWithRemainingQuantity(@Param("today") LocalDate today);

    /**
     * Lô <b>sắp</b> hết hạn và vẫn còn hàng thật trên kệ — nguồn của cảnh báo cận date (F1).
     *
     * <p>Cố ý là bản sao của {@link #findExpiredWithRemainingQuantity} với vế ngày đổi
     * thành khoảng [today, untilDate], KHÔNG dùng {@code findExpiringSoonWithStock} sẵn có:
     * hàm đó đếm theo {@code quantityIn} (số đã nhập ban đầu, không trừ phần đã bán) nên
     * một lô bán hết vẫn bị coi là còn hàng. Cảnh báo dựa trên số đó sẽ báo về những lô
     * không còn tồn tại trên kệ, và người dùng sẽ học cách bỏ qua chuông.
     *
     * <p>Mỗi phần tử: [StockBatch, số lượng còn lại].
     */
    @Query("""
            SELECT sb, COALESCE(SUM(bl.quantity), 0)
            FROM StockBatch sb
            JOIN sb.product p
            JOIN BatchLocation bl ON bl.batch = sb AND bl.isRemoved = false
            JOIN bl.location loc
            JOIN loc.storageZone sz
            WHERE sb.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
              AND sb.expiryDate IS NOT NULL
              AND sb.expiryDate >= :today
              AND sb.expiryDate <= :untilDate
            GROUP BY sb, p
            HAVING COALESCE(SUM(bl.quantity), 0) > 0
            ORDER BY sb.expiryDate ASC, sb.id ASC
            """)
    List<Object[]> findNearExpiryWithRemainingQuantity(@Param("today") LocalDate today,
                                                       @Param("untilDate") LocalDate untilDate);

    /**
     * Số thứ tự lớn nhất trong ngày cho mã lô dạng {prefix}-xx (một dấu '-').
     * dayPrefix ví dụ: L210826 hoặc LODH210826. Bỏ qua mã cũ LddMMyy-NCC-SP.
     */
    @Query(value = """
            SELECT MAX(CAST(SUBSTRING(batch_code, LOCATE('-', batch_code) + 1) AS UNSIGNED))
            FROM stock_batches
            WHERE batch_code LIKE CONCAT(:dayPrefix, '-%')
              AND batch_code NOT LIKE CONCAT(:dayPrefix, '-%-%')
            """, nativeQuery = true)
    Integer findMaxBatchSequenceByDayPrefix(@Param("dayPrefix") String dayPrefix);

}
