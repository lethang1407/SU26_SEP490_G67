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

    // Lấy 1 NCC còn hoạt động theo id — dùng cho màn chi tiết,
    // tránh trả về NCC đã bị xoá mềm (isRemoved = true).
    Optional<Supplier> findByIdAndIsRemovedFalse(Integer id);

    // Kiểm tra tồn tại nhanh, dùng để validate supplierId trước khi lấy lịch sử nhập hàng
    boolean existsByIdAndIsRemovedFalse(Integer id);

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

    // Nợ NCC (currentDebt) không còn lấy từ cột cache trên ImportOrder nữa.
    // Xem SupplierService.calculateDebtPerSupplier() — tính động từ
    // ImportOrder.totalCost - SUM(SupplierPayment.amount) để tránh lệch số liệu.
}
