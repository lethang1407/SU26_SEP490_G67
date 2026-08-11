package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.SalesOrder;
import java.util.List;
import java.util.Optional;
import java.time.Instant;


public interface SalesOrderRepository extends JpaRepository<SalesOrder, Integer> {
    @Query("SELECT o FROM SalesOrder o WHERE o.id = :id AND o.isRemoved = false")
    Optional<SalesOrder> findActiveById(@Param("id") Integer id);

    @Query("SELECT o.createdBy FROM SalesOrder o WHERE o.id = :id AND o.isRemoved = false")
    Optional<Integer> findCreatedById(@Param("id") Integer id);

    @Query("""
            SELECT o FROM SalesOrder o
            LEFT JOIN o.customer c
            WHERE o.isRemoved = false
              AND (:createdBy IS NULL OR o.createdBy = :createdBy)
              AND (:search IS NULL OR o.orderCode LIKE :search OR LOWER(c.fullName) LIKE :search)
              AND (:dateFrom IS NULL OR o.createdAt >= :dateFrom)
              AND (:dateTo   IS NULL OR o.createdAt <= :dateTo)
            ORDER BY o.createdAt DESC
            """)
    Page<SalesOrder> findHistory(@Param("createdBy") Integer createdBy, @Param("search") String search, @Param("dateFrom") Instant dateFrom, @Param("dateTo") Instant dateTo, Pageable pageable);

    @Query("SELECT o FROM SalesOrder o LEFT JOIN FETCH o.customer LEFT JOIN FETCH o.salesOrderDetails WHERE o.id = :id AND o.isRemoved = false")
    Optional<SalesOrder> findByIdWithDetails(@Param("id") Integer id);

    @Query(value = """
    SELECT so FROM SalesOrder so
    WHERE so.customer.id = :customerId
    AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
    ORDER BY
        CASE
            WHEN so.totalAmount > COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so AND dp.isRemoved = false), 0) AND so.dueDate < :now THEN 1
            WHEN so.totalAmount > COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so AND dp.isRemoved = false), 0) THEN 2
            ELSE 3
        END,
        so.createdAt DESC
    """, countQuery = """
    SELECT count(so) FROM SalesOrder so
    WHERE so.customer.id = :customerId
    AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
    """)
    Page<SalesOrder> findDebtOrdersByCustomerIdWithPriority(
            @Param("customerId") Integer customerId,
            @Param("keyword") String keyword,
            @Param("now") Instant now,
            Pageable pageable
    );

    List<SalesOrder> findAllByIsDebtTrueAndCreatedAtBetween(Instant start, Instant end);
}