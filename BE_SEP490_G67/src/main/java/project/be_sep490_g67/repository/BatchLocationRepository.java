package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.BatchLocation;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchLocationRepository extends JpaRepository<BatchLocation, Integer> {

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            WHERE bl.id = :id
              AND bl.isRemoved = false
            """)
    Optional<BatchLocation> findActiveWithDetailsById(@Param("id") Integer id);

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            WHERE bl.location.id = :locationId
              AND bl.isRemoved = false
              AND bl.quantity > 0
            """)
    List<BatchLocation> findActiveByLocationId(@Param("locationId") Integer locationId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.location.id = :locationId
              AND bl.isRemoved = false
            """)
    Optional<BatchLocation> findActiveByBatchIdAndLocationId(
            @Param("batchId") Integer batchId,
            @Param("locationId") Integer locationId);

    @Query("""
            SELECT COALESCE(SUM(bl.quantity), 0)
            FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
            """)
    Integer sumQuantityByBatchId(@Param("batchId") Integer batchId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            WHERE bl.isRemoved = false
              AND bl.quantity > 0
              AND loc.isRemoved = false
              AND (:locationLabel IS NULL OR :locationLabel = '' OR :locationLabel = 'all'
                   OR loc.label = :locationLabel)
            ORDER BY loc.label ASC, b.id ASC
            """)
    List<BatchLocation> findActiveAvailableLines(@Param("locationLabel") String locationLabel);
    @Query(
            """
                    SELECT bl from BatchLocation bl
                    JOIN fetch bl.batch sb
                    JOIN FETCH bl.location ls
                    WHERE sb.product.id = :productId AND bl.quantity > 0
                    AND bl.isRemoved = false
                    AND  sb.isRemoved = false 
                    AND ls.isRemoved = false 
                    ORDER BY sb.expiryDate ASC, sb.receivedDate ASC 
                    """
    )
    List<BatchLocation> findAvailableByProductId(@Param("productId") Integer productId);

    /**
     * Các dòng batch_location active của SP trên các khu có zone_type = SALES.
     */
    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch sb
            JOIN FETCH bl.location loc
            JOIN FETCH loc.storageZone sz
            WHERE sb.product.id = :productId
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND loc.isRemoved = false
              AND (sz.isRemoved = false OR sz.isRemoved IS NULL)
              AND sz.zoneType = 'SALES'
            """)
    List<BatchLocation> findActiveOnSalesZonesByProductId(@Param("productId") Integer productId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
            ORDER BY bl.quantity DESC, bl.id ASC
            LIMIT 1
            """)
    Optional<BatchLocation> findFirstByBatchId(@Param("batchId") Integer batchId);

    /**
     * Mọi dòng (vị trí, lô) còn hàng của một SP — dùng cho dropdown chọn vị trí ở POS.
     * Khu bán xếp trước (dòng đầu tiên là mặc định của POS), rồi FIFO theo ngày nhập.
     * Lô chưa có ngày nhập bị đẩy xuống cuối (NULLS LAST viết bằng CASE cho portable).
     */
    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch sb
            JOIN FETCH bl.location loc
            JOIN FETCH loc.storageZone sz
            WHERE sb.product.id = :productId
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND loc.isRemoved = false
              AND (sz.isRemoved = false OR sz.isRemoved IS NULL)
            ORDER BY CASE WHEN sz.zoneType = 'SALES' THEN 0 ELSE 1 END ASC,
                     CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END ASC,
                     sb.receivedDate ASC,
                     sb.id ASC
            """)
    List<BatchLocation> findPosLinesByProductId(@Param("productId") Integer productId);

    /**
     * Hàng còn lại của một SP tại đúng một ô, FIFO theo ngày nhập.
     * Dùng khi thu ngân đã chốt vị trí lấy hàng trên POS.
     */
    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch sb
            JOIN FETCH bl.location loc
            WHERE sb.product.id = :productId
              AND loc.id = :locationId
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND loc.isRemoved = false
            ORDER BY CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END ASC,
                     sb.receivedDate ASC,
                     sb.id ASC
            """)
    List<BatchLocation> findAvailableByProductIdAndLocationId(
            @Param("productId") Integer productId,
            @Param("locationId") Integer locationId);
}
