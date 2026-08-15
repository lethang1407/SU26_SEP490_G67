package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Supplier;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Integer> {

    boolean existsSuppliersBySupplierCode(String supplierCode);

    boolean existsBySupplierCodeAndIdNot(String supplierCode, Integer id);

    // Lấy 1 NCC còn hoạt động theo id — dùng cho màn chi tiết,
    // tránh trả về NCC đã bị xoá mềm (isRemoved = true).
    Optional<Supplier> findByIdAndIsRemovedFalse(Integer id);

    // Kiểm tra tồn tại nhanh, dùng để validate supplierId trước khi lấy lịch sử nhập hàng
    boolean existsByIdAndIsRemovedFalse(Integer id);

    // Lấy tất cả NCC đang hoạt động, lọc theo tên + danh mục (tuỳ chọn)
    @Query("""
            SELECT DISTINCT s FROM Supplier s
            LEFT JOIN s.categories c
            WHERE s.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:categoryId IS NULL OR c.id = :categoryId)
            ORDER BY s.createdAt DESC
            """)
    List<Supplier> searchSuppliers(@Param("search") String search,
                                   @Param("categoryId") Integer categoryId);

    /**
     * NCC từng nhập đúng SP này (phiếu IMPORTED, chưa xoá).
     * Cột 0 = supplierId, cột 1 = thời điểm nhập gần nhất.
     */
    @Query("""
            SELECT s.id, MAX(o.createdAt)
            FROM ImportOrderDetail d
            JOIN d.importOrder o
            JOIN o.supplier s
            WHERE d.product.id = :productId
              AND o.orderStatus = 'IMPORTED'
              AND o.isRemoved = false
              AND s.isRemoved = false
            GROUP BY s.id
            """)
    List<Object[]> findImportedSupplierIdsByProductId(@Param("productId") Integer productId);
}
