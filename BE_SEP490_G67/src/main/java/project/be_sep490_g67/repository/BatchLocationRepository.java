package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.BatchLocation;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BatchLocationRepository extends JpaRepository<BatchLocation, Integer> {

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            LEFT JOIN FETCH loc.storageZone sz
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
            SELECT bl FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
            ORDER BY CASE WHEN bl.isRemoved = false THEN 0 ELSE 1 END, bl.id ASC
            """)
    List<BatchLocation> findAllByBatchId(@Param("batchId") Integer batchId);

    @Query("""
            SELECT COALESCE(SUM(bl.quantity), 0)
            FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
            """)
    Integer sumQuantityByBatchId(@Param("batchId") Integer batchId);

    /**
     * Tồn bán được theo SP: Σ batch_locations, loại khu RETURN_HOLD
     * (hàng đổi/trả bán hàng đang giữ / chờ trả NCC).
     * Hàng đã reserve trả NCC cũng không còn trên kệ nên đã bị trừ sẵn.
     * Mỗi phần tử là [productId, tổng số lượng].
     */
    @Query("""
            SELECT sb.product.id, COALESCE(SUM(bl.quantity), 0)
            FROM BatchLocation bl
            JOIN bl.batch sb
            JOIN bl.location loc
            JOIN loc.storageZone sz
            WHERE sb.product.id IN :productIds
              AND bl.isRemoved = false
              AND (sb.isRemoved = false OR sb.isRemoved IS NULL)
              AND sz.zoneType <> 'RETURN_HOLD'
            GROUP BY sb.product.id
            """)
    List<Object[]> sumQuantityByProductIds(@Param("productIds") Collection<Integer> productIds);

    /**
     * Tồn BÁN ĐƯỢC của nhiều sản phẩm trong một lượt truy vấn. Dùng đúng bộ lọc của
     * {@link #findPosLinesByProductId} để con số hiện trên ô tìm kiếm POS khớp với
     * lượng mà checkout thật sự trừ được.
     *
     * <p>Khác {@link #sumQuantityByProductIds}: ở đây loại thêm lô đã hết hạn, ô/lô đã
     * xoá mềm và dòng đã hết hàng. Mỗi phần tử là [productId, tổng số lượng].
     */
    @Query("""
            SELECT sb.product.id, COALESCE(SUM(bl.quantity), 0)
            FROM BatchLocation bl
            JOIN bl.batch sb
            JOIN bl.location loc
            JOIN loc.storageZone sz
            WHERE sb.product.id IN :productIds
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND loc.isRemoved = false
              AND (sz.isRemoved = false OR sz.isRemoved IS NULL)
              AND sz.zoneType <> 'RETURN_HOLD'
              AND (sb.expiryDate IS NULL OR sb.expiryDate >= CURRENT_DATE)
            GROUP BY sb.product.id
            """)
    List<Object[]> sumSellableByProductIds(@Param("productIds") Collection<Integer> productIds);

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            JOIN FETCH loc.storageZone sz
            WHERE bl.isRemoved = false
              AND bl.quantity > 0
              AND loc.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
              AND (:locationLabel IS NULL OR :locationLabel = '' OR :locationLabel = 'all'
                   OR loc.label = :locationLabel)
            ORDER BY loc.label ASC, b.id ASC
            """)
    List<BatchLocation> findActiveAvailableLines(@Param("locationLabel") String locationLabel);

    /** khu RT bị loại để không bán nhầm. */
    @Query(
            """
                    SELECT bl from BatchLocation bl
                    JOIN fetch bl.batch sb
                    JOIN FETCH bl.location ls
                    JOIN FETCH ls.storageZone sz
                    WHERE sb.product.id = :productId AND bl.quantity > 0
                    AND bl.isRemoved = false
                    AND  sb.isRemoved = false
                    AND ls.isRemoved = false
                    AND sz.zoneType <> 'RETURN_HOLD'
                    ORDER BY CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END,
                             sb.receivedDate ASC, sb.id ASC
                    """
    )
    List<BatchLocation> findAvailableByProductId(@Param("productId") Integer productId);

    /**
     * Hàng BÁN ĐƯỢC của một SP, sắp FIFO: lô nhập trước bán trước theo
     * {@code received_date}. Lô chưa có ngày nhập xuống cuối (MySQL xếp NULL lên đầu khi
     * ASC - để nguyên thì lô không rõ ngày nhập lại bị bán trước lô nhập sớm nhất).
     * Lô đã hết hạn vẫn bị loại hẳn khỏi đường bán.
     *
     * <p>Tách khỏi {@link #findAvailableByProductId} vì trả hàng NCC và kiểm kho vẫn phải
     * nhìn thấy lô quá hạn; chỉ đường bán hàng mới được lọc.
     */
    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch sb
            JOIN FETCH bl.location ls
            JOIN FETCH ls.storageZone sz
            WHERE sb.product.id = :productId
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND ls.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
              AND (sb.expiryDate IS NULL OR sb.expiryDate >= CURRENT_DATE)
            ORDER BY CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END,
                     sb.receivedDate ASC, sb.id ASC
            """)
    List<BatchLocation> findSellableByProductId(@Param("productId") Integer productId);
    @Query("""
        SELECT COALESCE(SUM(bl.quantity), 0)
        FROM BatchLocation bl
        JOIN bl.batch b
        JOIN bl.location loc
        JOIN loc.storageZone sz
        WHERE b.product.id = :productId
          AND (bl.isRemoved = false OR bl.isRemoved IS NULL)
          AND (b.isRemoved = false OR b.isRemoved IS NULL)
          AND sz.zoneType <> 'RETURN_HOLD'
        """)
    Long sumOnHandByProductId(@Param("productId") Integer productId);

    /**
     * Ô đang giữ nhiều hàng nhất của lô - dùng khi nhập hàng trả bán lại được về kho.
     * Loại khu RT để hàng RESELLABLE không bị nhập ngược vào chỗ chứa hàng hỏng.
     */
    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN bl.location loc
            JOIN loc.storageZone sz
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
            ORDER BY bl.quantity DESC, bl.id ASC
            LIMIT 1
            """)
    Optional<BatchLocation> findFirstByBatchId(@Param("batchId") Integer batchId);

    /**
     * Mọi dòng (vị trí, lô) còn hàng của một SP — dùng cho dropdown chọn vị trí ở POS.
     * Sắp FIFO theo ngày nhập (lô chưa có ngày nhập xuống cuối); loại khu RETURN_HOLD
     * và lô đã hết hạn.
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
              AND sz.zoneType <> 'RETURN_HOLD'
              AND (sb.expiryDate IS NULL OR sb.expiryDate >= CURRENT_DATE)
            ORDER BY CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END,
                     sb.receivedDate ASC, sb.id ASC
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
            JOIN FETCH loc.storageZone sz
            WHERE sb.product.id = :productId
              AND loc.id = :locationId
              AND bl.quantity > 0
              AND bl.isRemoved = false
              AND sb.isRemoved = false
              AND loc.isRemoved = false
              AND sz.zoneType <> 'RETURN_HOLD'
              AND (sb.expiryDate IS NULL OR sb.expiryDate >= CURRENT_DATE)
            ORDER BY CASE WHEN sb.receivedDate IS NULL THEN 1 ELSE 0 END,
                     sb.receivedDate ASC, sb.id ASC
            """)
    List<BatchLocation> findAvailableByProductIdAndLocationId(
            @Param("productId") Integer productId,
            @Param("locationId") Integer locationId);
}
