package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.SupplierPayment;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SupplierPaymentRepository extends JpaRepository<SupplierPayment, Integer> {

    // Tổng số tiền đã trả, gộp theo từng đơn nhập: mỗi phần tử là [importOrderId, totalPaid]
    // Dùng 1 query duy nhất cho tất cả đơn (tránh N+1) khi tính nợ NCC.
    @Query("""
            SELECT sp.importOrder.id, COALESCE(SUM(sp.amount), 0)
            FROM SupplierPayment sp
            WHERE sp.isRemoved = false
              AND sp.importOrder IS NOT NULL
            GROUP BY sp.importOrder.id
            """)
    List<Object[]> sumPaidAmountGroupByImportOrder();

    // Tổng đã trả cho 1 đơn nhập cụ thể — dùng khi validate/tạo thanh toán mới
    @Query("""
            SELECT COALESCE(SUM(sp.amount), 0)
            FROM SupplierPayment sp
            WHERE sp.importOrder.id = :importOrderId
              AND sp.isRemoved = false
            """)
    BigDecimal sumPaidAmountByImportOrder(@Param("importOrderId") Integer importOrderId);

    // Toàn bộ lịch sử thanh toán của 1 NCC, kèm đơn nhập liên quan (JOIN FETCH tránh N+1).
    // Sắp xếp tăng dần theo thời gian để Service derive "nợ còn lại sau mỗi lần trả"
    // bằng cách cộng dồn theo đúng thứ tự xảy ra, không cache field này ở DB.
    @Query("""
            SELECT sp FROM SupplierPayment sp
            LEFT JOIN FETCH sp.importOrder io
            WHERE sp.supplier.id = :supplierId
              AND sp.isRemoved = false
            ORDER BY sp.paymentDate ASC, sp.id ASC
            """)
    List<SupplierPayment> findAllBySupplierOrderByPaymentDateAsc(@Param("supplierId") Integer supplierId);
}
