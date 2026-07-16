package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.SalesOrder;

import java.time.Instant;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Integer> {

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
}