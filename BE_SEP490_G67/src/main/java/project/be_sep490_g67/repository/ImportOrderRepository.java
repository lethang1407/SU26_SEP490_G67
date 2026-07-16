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

    // Lấy các đơn nhập còn hiệu lực của NCC còn hoạt động — dùng để tính nợ NCC
    // (nợ = totalCost - tổng đã trả, tính ở Service, không cache trên entity)
    @Query("""
            SELECT io FROM ImportOrder io
            WHERE io.isRemoved = false
              AND io.supplier.isRemoved = false
            """)
    List<ImportOrder> findAllActiveWithActiveSupplier();

    // Lịch sử nhập hàng của 1 NCC, lọc theo mã đơn (search) — chưa phân trang ở SQL
    // vì trạng thái Đang nợ/Hoàn thành là derive (không có cột), phải tính + lọc ở Service.
    // Với quy mô 1 cửa hàng nhỏ (tối đa vài trăm đơn/NCC) cách này vẫn đủ nhanh.
    @Query("""
            SELECT io FROM ImportOrder io
            WHERE io.supplier.id = :supplierId
              AND io.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(io.orderCode) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY io.receivedDate DESC, io.id DESC
            """)
    List<ImportOrder> searchBySupplier(@Param("supplierId") Integer supplierId, @Param("search") String search);

    // Lấy 1 đơn nhập kèm chi tiết mặt hàng (JOIN FETCH) cho modal xem chi tiết, tránh N+1
    @Query("""
            SELECT DISTINCT io FROM ImportOrder io
            LEFT JOIN FETCH io.importOrderDetails iod
            LEFT JOIN FETCH iod.product
            LEFT JOIN FETCH io.supplier
            WHERE io.id = :id
              AND io.isRemoved = false
            """)
    Optional<ImportOrder> findDetailById(@Param("id") Integer id);

    @Query("""
            SELECT DISTINCT io FROM ImportOrder io
            JOIN FETCH io.supplier s
            WHERE io.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(io.orderCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY io.receivedDate DESC, io.id DESC
            """)
    List<ImportOrder> searchAll(@Param("search") String search);

    @Query("""
            SELECT DISTINCT io FROM ImportOrder io
            LEFT JOIN FETCH io.stockBatches sb
            LEFT JOIN FETCH sb.product
            WHERE io.id = :id
              AND io.isRemoved = false
            """)
    Optional<ImportOrder> findWithBatchesById(@Param("id") Integer id);
}
