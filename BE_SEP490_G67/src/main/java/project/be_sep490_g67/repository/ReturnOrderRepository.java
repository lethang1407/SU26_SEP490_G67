package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ReturnOrder;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnOrderRepository extends JpaRepository<ReturnOrder, Integer> {

    @Query("SELECT r FROM ReturnOrder r WHERE r.id = :id AND r.isRemoved = false")
    Optional<ReturnOrder> findActiveById(@Param("id") Integer id);

    @Query("SELECT r FROM ReturnOrder r WHERE r.salesOrder.id = :salesOrderId AND r.isRemoved = false ORDER BY r.createdAt ASC")
    List<ReturnOrder> findAllBySalesOrderId(@Param("salesOrderId") Integer salesOrderId);

    @Query("""
            SELECT DISTINCT r FROM ReturnOrder r
            LEFT JOIN FETCH r.returnOrderDetails rd
            LEFT JOIN FETCH rd.product
            LEFT JOIN FETCH rd.salesOrderDetail
            WHERE r.salesOrder.id = :salesOrderId
              AND r.isRemoved = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<ReturnOrder> findAllBySalesOrderIdWithDetails(@Param("salesOrderId") Integer salesOrderId);

    /**
     * Phiếu trả của nhiều hóa đơn cùng lúc (dùng cho lịch sử hóa đơn, tránh N+1).
     * Sắp xếp tăng dần theo thời gian: phiếu cuối cùng của mỗi hóa đơn là phiếu mới nhất.
     */
    @Query("""
            SELECT r FROM ReturnOrder r
            WHERE r.salesOrder.id IN :salesOrderIds
              AND r.isRemoved = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<ReturnOrder> findAllBySalesOrderIds(@Param("salesOrderIds") List<Integer> salesOrderIds);
}
