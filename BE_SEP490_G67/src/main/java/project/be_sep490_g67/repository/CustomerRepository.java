package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.Customer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Integer> {

    /**
     * Look up an active customer by phone number.
     */
    @Query("SELECT c FROM Customer c WHERE c.phoneNumber = :phone AND c.isRemoved = false")
    Optional<Customer> findByPhoneNumber(@Param("phone") String phone);

    @Query("""
            SELECT COALESCE(SUM(c.totalDebt), 0)
            FROM Customer c
            WHERE c.isRemoved = false
            """)
    BigDecimal getTotalDebt();

    @Query("""
            SELECT COUNT(c)
            FROM Customer c
            WHERE c.isRemoved = false
              AND c.totalDebt > 0
            """)
    long countInDebtCustomers();

    @Query("""
            SELECT COUNT(c)
            FROM Customer c
            WHERE c.isRemoved = false
              AND (c.totalDebt IS NULL OR c.totalDebt <= 0)
            """)
    long countDebtFreeCustomers();

    boolean existsByPhoneNumberAndIsRemovedFalse(String phoneNumber);

    @Query(value = """
    SELECT c
    FROM Customer c
    WHERE c.isRemoved = false

    AND (
        :keyword IS NULL
        OR TRIM(:keyword) = ''
        OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(c.phoneNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
    )

    AND (
        :status IS NULL
        OR (:status = 'IN_DEBT' AND c.totalDebt > 0)
        OR (:status = 'NO_DEBT' AND (c.totalDebt IS NULL OR c.totalDebt <= 0))
        OR (:status = 'OVERDUE' AND EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
    )
    
    AND (
        :isOverdue IS NULL
        OR (:isOverdue = true AND EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
        OR (:isOverdue = false AND NOT EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
    )

    AND (:allowDebt IS NULL OR c.allowDebt = :allowDebt)
    AND (
        :fromDate IS NULL OR EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.createdAt >= :fromDate
        )
    )
    AND (
        :toDate IS NULL OR EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.createdAt < :toDate
        )
    )
    """)
    List<Customer> findFilteredCustomers(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("allowDebt") Boolean allowDebt,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            @Param("now") Instant now,
            @Param("isOverdue") Boolean isOverdue
    );
    
    @Query(value = """
    SELECT c
    FROM Customer c
    WHERE c.isRemoved = false

    AND (
        :keyword IS NULL
        OR TRIM(:keyword) = ''
        OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(c.phoneNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
    )

    AND (
        :status IS NULL
        OR (:status = 'IN_DEBT' AND c.totalDebt > 0)
        OR (:status = 'NO_DEBT' AND (c.totalDebt IS NULL OR c.totalDebt <= 0))
        OR (:status = 'OVERDUE' AND EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
    )
    
    AND (
        :isOverdue IS NULL
        OR (:isOverdue = true AND EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
        OR (:isOverdue = false AND NOT EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.dueDate < :now
              AND so.totalAmount > (so.paidAmount + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp WHERE dp.salesOrder = so), 0))
        ))
    )

    AND (:allowDebt IS NULL OR c.allowDebt = :allowDebt)
    AND (
        :fromDate IS NULL OR EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.createdAt >= :fromDate
        )
    )
    AND (
        :toDate IS NULL OR EXISTS (
            SELECT 1 FROM SalesOrder so
            WHERE so.customer = c AND so.isDebt = true AND so.createdAt < :toDate
        )
    )
    """)
    Page<Customer> findFilteredCustomersWithPaging(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("allowDebt") Boolean allowDebt,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            @Param("now") Instant now,
            @Param("isOverdue") Boolean isOverdue,
            Pageable pageable
    );
}