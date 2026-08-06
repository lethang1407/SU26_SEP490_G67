package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrderDetail;

import java.time.Instant;
import java.util.List;

@Repository
public interface ImportOrderDetailRepository extends JpaRepository<ImportOrderDetail, Integer> {

    @Query("""
        SELECT d FROM ImportOrderDetail d
        JOIN FETCH d.importOrder o
        JOIN FETCH o.supplier s
        JOIN FETCH d.product p
        WHERE (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
          AND o.createdAt >= :from
          AND o.createdAt < :to
          AND (:productId IS NULL OR p.id = :productId)
          AND (:status IS NULL OR :status = '' OR UPPER(o.orderStatus) = UPPER(:status))
          AND (:supplierKeyword IS NULL OR :supplierKeyword = ''
               OR LOWER(s.name) LIKE LOWER(CONCAT('%', :supplierKeyword, '%'))
               OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :supplierKeyword, '%')))
        ORDER BY o.createdAt DESC, d.id DESC
        """)
    List<ImportOrderDetail> findHistoryRows(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("productId") Integer productId,
            @Param("status") String status,
            @Param("supplierKeyword") String supplierKeyword);

    /**
     * DRAFT open PO rows for products — newest order first.
     * Columns: productId, orderId, orderCode, quantity
     */
    @Query("""
        SELECT p.id, o.id, o.orderCode, d.quantity
        FROM ImportOrderDetail d
        JOIN d.importOrder o
        JOIN d.product p
        WHERE p.id IN :productIds
          AND (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND o.orderStatus = 'DRAFT'
        ORDER BY o.id DESC, d.id DESC
        """)
    List<Object[]> findDraftOpenPoRows(@Param("productIds") List<Integer> productIds);

    /**
     * Recent costs by product + supplier — newest order first.
     * Columns: productId, supplierId, costPerUnit, orderId
     */
    @Query("""
        SELECT p.id, s.id, d.costPerUnit, o.id
        FROM ImportOrderDetail d
        JOIN d.importOrder o
        JOIN o.supplier s
        JOIN d.product p
        WHERE p.id IN :productIds
          AND (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND (s.isRemoved = false OR s.isRemoved IS NULL)
          AND d.costPerUnit IS NOT NULL
        ORDER BY o.id DESC
        """)
    List<Object[]> findRecentCostsByProductIds(@Param("productIds") List<Integer> productIds);
}
