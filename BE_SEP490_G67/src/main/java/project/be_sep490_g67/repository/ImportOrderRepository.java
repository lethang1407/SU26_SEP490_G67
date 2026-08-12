package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrder;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportOrderRepository extends JpaRepository<ImportOrder, Integer> {

    // Chỉ đơn IMPORTED mới tính nợ NCC. DRAFT / null không tính công nợ.
    @Query("""
            SELECT io FROM ImportOrder io
            WHERE io.isRemoved = false
              AND io.supplier.isRemoved = false
              AND io.orderStatus = 'IMPORTED'
            """)
    List<ImportOrder> findAllActiveWithActiveSupplier();

    @Query("""
            SELECT io FROM ImportOrder io
            JOIN FETCH io.supplier
            WHERE io.supplier.id = :supplierId
              AND io.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(io.orderCode) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY io.createdAt DESC, io.id DESC
            """)
    List<ImportOrder> searchBySupplier(@Param("supplierId") Integer supplierId, @Param("search") String search);

    // Danh sách đơn nhập toàn cửa hàng — lọc search + orderStatus ở SQL;
    // remainingDebt vẫn derive ở Service nên pagination cũng cắt ở Service.
    @Query("""
            SELECT io FROM ImportOrder io
            JOIN FETCH io.supplier s
            WHERE io.isRemoved = false
              AND s.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(io.orderCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(s.supplierCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:orderStatus IS NULL OR :orderStatus = '' OR :orderStatus = 'ALL'
                   OR io.orderStatus = :orderStatus)
            ORDER BY io.createdAt DESC, io.id DESC
            """)
    List<ImportOrder> searchAll(
            @Param("search") String search,
            @Param("orderStatus") String orderStatus);

    // Lấy 1 đơn nhập kèm NCC + chi tiết mặt hàng + ĐVT (JOIN FETCH), tránh N+1
    @Query("""
            SELECT DISTINCT io FROM ImportOrder io
            JOIN FETCH io.supplier s
            LEFT JOIN FETCH io.importOrderDetails iod
            LEFT JOIN FETCH iod.product
            LEFT JOIN FETCH iod.productUnit
            WHERE io.id = :id
              AND io.isRemoved = false
            """)
    Optional<ImportOrder> findDetailById(@Param("id") Integer id);

    /** Load phiếu để update — không FETCH detail (tránh xung đột khi bulk delete dòng cũ). */
    @Query("""
            SELECT io FROM ImportOrder io
            JOIN FETCH io.supplier s
            WHERE io.id = :id
              AND io.isRemoved = false
            """)
    Optional<ImportOrder> findActiveByIdForUpdate(@Param("id") Integer id);

    /** Mã dạng NH###### — lấy mã lớn nhất để +1 (zero-pad nên sort string = sort số). */
    @Query(value = """
            SELECT order_code
            FROM import_orders
            WHERE order_code REGEXP '^NH[0-9]{6}$'
            ORDER BY order_code DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<String> findLatestNhOrderCode();
}
