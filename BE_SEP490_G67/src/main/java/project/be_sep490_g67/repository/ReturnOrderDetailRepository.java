package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ReturnOrderDetail;

import java.util.List;

@Repository
public interface ReturnOrderDetailRepository extends JpaRepository<ReturnOrderDetail, Integer> {

    @Query("SELECT rd FROM ReturnOrderDetail rd WHERE rd.returnOrder.id = :returnOrderId AND rd.isRemoved = false")
    List<ReturnOrderDetail> findByReturnOrderId(@Param("returnOrderId") Integer returnOrderId);

    @Query("""
            SELECT rd.salesOrderDetail.id, SUM(rd.quantity)
            FROM ReturnOrderDetail rd
            WHERE rd.salesOrderDetail.salesOrder.id = :salesOrderId
              AND rd.salesOrderDetail.id IS NOT NULL
              AND rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
            GROUP BY rd.salesOrderDetail.id
            """)
    List<Object[]> sumReturnedQuantityByOrder(@Param("salesOrderId") Integer salesOrderId);

    @Query("""
            SELECT rd.salesOrderDetail.salesOrder.id, rd.salesOrderDetail.id, SUM(rd.quantity)
            FROM ReturnOrderDetail rd
            WHERE rd.salesOrderDetail.salesOrder.id IN :salesOrderIds
              AND rd.salesOrderDetail.id IS NOT NULL
              AND rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
            GROUP BY rd.salesOrderDetail.salesOrder.id, rd.salesOrderDetail.id
            """)
    List<Object[]> sumReturnedQuantityByOrders(@Param("salesOrderIds") List<Integer> salesOrderIds);
}
