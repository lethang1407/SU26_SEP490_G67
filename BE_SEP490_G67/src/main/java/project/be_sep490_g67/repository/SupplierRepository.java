package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Supplier;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Integer> {

    boolean existsSuppliersBySupplierCode(String supplierCode);

    // Lấy tất cả NCC đang hoạt động, lọc theo từ khóa tìm kiếm
    @Query("""
            SELECT s FROM Supplier s
            WHERE s.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(s.name)          LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(s.supplierCode)  LIKE LOWER(CONCAT('%', :search, '%'))
                   OR s.phoneNumber          LIKE CONCAT('%', :search, '%'))
            ORDER BY s.createdAt DESC
            """)
    List<Supplier> searchSuppliers(@Param("search") String search);

    // Lấy nợ hiện tại của từng NCC: mỗi phần tử là [supplierId, totalDebt]
    @Query("""
            SELECT io.supplier.id, COALESCE(SUM(io.remainingDebt), 0)
            FROM ImportOrder io
            WHERE io.isRemoved = false
              AND io.paymentStatus IN ('UNPAID', 'PARTIAL')
            GROUP BY io.supplier.id
            """)
    List<Object[]> findDebtPerSupplier();

    // Tổng nợ toàn bộ NCC — dùng cho summary card
    @Query("""
            SELECT COALESCE(SUM(io.remainingDebt), 0)
            FROM ImportOrder io
            WHERE io.isRemoved = false
              AND io.paymentStatus IN ('UNPAID', 'PARTIAL')
              AND io.supplier.isRemoved = false
            """)
    BigDecimal calculateTotalDebt();
}
