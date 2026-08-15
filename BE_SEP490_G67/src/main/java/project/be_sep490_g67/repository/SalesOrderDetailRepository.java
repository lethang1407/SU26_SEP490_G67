package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.SalesOrderDetail;

import java.time.Instant;
import java.util.List;

@Repository
public interface SalesOrderDetailRepository extends JpaRepository<SalesOrderDetail, Integer> {

    @Query("""
        SELECT COALESCE(SUM(d.quantity), 0)
        FROM SalesOrderDetail d
        JOIN d.salesOrder o
        WHERE d.product.id = :productId
          AND (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND o.createdAt >= :from
          AND o.createdAt < :to
        """)
    Long sumQtyByProductAndDateRange(
            @Param("productId") Integer productId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("""
        SELECT d FROM SalesOrderDetail d
        JOIN FETCH d.salesOrder o
        LEFT JOIN FETCH o.customer c
        JOIN FETCH d.product p
        WHERE (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
          AND o.createdAt >= :from
          AND o.createdAt < :to
          AND (:productId IS NULL OR p.id = :productId)
          AND (:status IS NULL OR :status = '' OR UPPER(o.orderStatus) = UPPER(:status))
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(c.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY o.createdAt DESC, d.id DESC
        """)
    List<SalesOrderDetail> findHistoryRows(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("productId") Integer productId,
            @Param("status") String status,
            @Param("keyword") String keyword);

    /**
     * Sản lượng bán của từng SP kể từ {@code since} — dùng để nâng cảnh báo hết hàng từ
     * cam lên đỏ khi SP đó bán chạy (hết hàng của SP bán chạy thiệt hại nặng hơn nhiều
     * so với SP nằm im). Mỗi phần tử: [productId, số lượng đã bán].
     */
    @Query("""
            SELECT sod.product.id, COALESCE(SUM(sod.quantity), 0)
            FROM SalesOrderDetail sod
            WHERE sod.product.id IN :productIds
              AND sod.isRemoved = false
              AND sod.salesOrder.isRemoved = false
              AND sod.salesOrder.createdAt >= :since
            GROUP BY sod.product.id
            """)
    List<Object[]> sumSoldQuantityByProductsSince(
            @Param("productIds") List<Integer> productIds,
            @Param("since") Instant since);
}
