package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ReturnOrderDetail;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
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

    @Query("""
            SELECT rd FROM ReturnOrderDetail rd
            JOIN FETCH rd.product p
            WHERE rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
              AND rd.processedAt IS NULL
              AND rd.itemCondition IN :conditions
            ORDER BY rd.createdAt ASC, rd.id ASC
            """)
    List<ReturnOrderDetail> findAwaitingProcessing(@Param("conditions") Collection<String> conditions);

    /**
     * Giá trị hoàn của riêng một sản phẩm trong khoảng thời gian.
     *
     * <p>Cộng theo dòng ({@code lineRefund}) chứ không theo phiếu, vì một phiếu trả có
     * thể gồm nhiều sản phẩm. Chiết khấu trả hàng ghi ở cấp phiếu nên không phân bổ
     * được về từng dòng, con số này vì thế là giá trị hoàn trước chiết khấu.
     */
    @Query("""
            SELECT COALESCE(SUM(rd.lineRefund), 0)
            FROM ReturnOrderDetail rd
            WHERE rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
              AND rd.product.id = :productId
              AND rd.returnOrder.createdAt >= :from
              AND rd.returnOrder.createdAt < :to
            """)
    BigDecimal sumRefundByProductBetween(
            @Param("productId") Integer productId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /** Số phiếu đổi/trả có chứa sản phẩm này trong khoảng thời gian. */
    @Query("""
            SELECT COUNT(DISTINCT rd.returnOrder.id)
            FROM ReturnOrderDetail rd
            WHERE rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
              AND rd.product.id = :productId
              AND rd.returnOrder.createdAt >= :from
              AND rd.returnOrder.createdAt < :to
            """)
    long countByProductBetween(
            @Param("productId") Integer productId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Sản lượng khách trả lại của từng SP kể từ {@code since}, QUY VỀ ĐƠN VỊ CƠ SỞ.
     *
     * <p>Trừ khỏi sản lượng bán để ra nhu cầu thật: hàng bán rồi bị trả lại không phải
     * là nhu cầu, và nó cũng đã quay về kho nên không tạo áp lực nhập.
     *
     * <p>Mỗi phần tử: [productId, sản lượng trả theo đơn vị cơ sở].
     */
    @Query("""
            SELECT rd.product.id,
                   COALESCE(SUM(rd.quantity * COALESCE(rd.productUnit.unitBase, 1)), 0)
            FROM ReturnOrderDetail rd
            WHERE rd.product.id IN :productIds
              AND rd.isRemoved = false
              AND rd.returnOrder.isRemoved = false
              AND rd.returnOrder.createdAt >= :since
            GROUP BY rd.product.id
            """)
    List<Object[]> sumReturnedBaseQuantityByProductsSince(
            @Param("productIds") List<Integer> productIds,
            @Param("since") Instant since);
}
