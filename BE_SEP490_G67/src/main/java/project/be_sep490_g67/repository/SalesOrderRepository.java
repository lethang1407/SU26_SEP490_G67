package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.SalesOrder;
import java.math.BigDecimal;
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
              AND (:orderCode IS NULL OR LOWER(o.orderCode) LIKE :orderCode)
              AND (:customer IS NULL OR LOWER(c.fullName) LIKE :customer OR c.phoneNumber LIKE :customer)
              AND (:product IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d
                    WHERE d.salesOrder = o
                      AND (LOWER(d.product.name) LIKE :product OR LOWER(d.product.barcode) LIKE :product)))
              AND (:dateFrom IS NULL OR o.createdAt >= :dateFrom)
              AND (:dateTo   IS NULL OR o.createdAt <= :dateTo)
            ORDER BY o.createdAt DESC
            """)
    Page<SalesOrder> findHistory(@Param("createdBy") Integer createdBy,
                                 @Param("search") String search,
                                 @Param("orderCode") String orderCode,
                                 @Param("customer") String customer,
                                 @Param("product") String product,
                                 @Param("dateFrom") Instant dateFrom,
                                 @Param("dateTo") Instant dateTo,
                                 Pageable pageable);

    @Query("""
            SELECT DISTINCT o FROM SalesOrder o
            LEFT JOIN o.customer c
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND (:orderCode IS NULL OR LOWER(o.orderCode) LIKE :orderCode)
              AND (:customerPhone IS NULL OR c.phoneNumber LIKE :customerPhone)
              AND (:customerName IS NULL OR LOWER(c.fullName) LIKE :customerName)
              AND (:from IS NULL OR o.createdAt >= :from)
              AND (:to   IS NULL OR o.createdAt <= :to)
              AND (:productId IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d
                    WHERE d.salesOrder = o AND d.isRemoved = false
                      AND d.product.id = :productId))
              AND (:barcode IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d2
                    WHERE d2.salesOrder = o AND d2.isRemoved = false
                      AND LOWER(d2.product.barcode) = :barcode))
              AND (:amountMin IS NULL OR o.totalAmount >= :amountMin)
              AND (:amountMax IS NULL OR o.totalAmount <= :amountMax)
            ORDER BY o.createdAt DESC
            """)
    Page<SalesOrder> searchForReturn(@Param("orderCode") String orderCode,
                                     @Param("customerPhone") String customerPhone,
                                     @Param("customerName") String customerName,
                                     @Param("from") Instant from,
                                     @Param("to") Instant to,
                                     @Param("productId") Integer productId,
                                     @Param("barcode") String barcode,
                                     @Param("amountMin") BigDecimal amountMin,
                                     @Param("amountMax") BigDecimal amountMax,
                                     Pageable pageable);

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
}