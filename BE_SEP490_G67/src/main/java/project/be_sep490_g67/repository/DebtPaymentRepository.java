package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.DebtPayment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Repository
public interface DebtPaymentRepository extends JpaRepository<DebtPayment, Integer> {

    @Query("""
            SELECT COALESCE(SUM(dp.amountPaid), 0)
            FROM DebtPayment dp
            WHERE dp.createdAt >= :startOfDay
              AND dp.createdAt < :endOfDay
            """)
    BigDecimal getTodayCollectedAmount(
            Instant startOfDay,
            Instant endOfDay
    );

    @Query(value = """
            SELECT dp FROM DebtPayment dp
            JOIN dp.salesOrder so
            JOIN so.customer c
            WHERE
                (:startDate IS NULL OR dp.createdAt >= :startDate)
            AND (:endDate IS NULL OR dp.createdAt < :endDate)
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:staffId IS NULL OR dp.createdBy = :staffId)
            AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
            """,
            countQuery = """
            SELECT count(dp) FROM DebtPayment dp
            JOIN dp.salesOrder so
            JOIN so.customer c
            WHERE
                (:startDate IS NULL OR dp.createdAt >= :startDate)
            AND (:endDate IS NULL OR dp.createdAt < :endDate)
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:staffId IS NULL OR dp.createdBy = :staffId)
            AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
            """)
    Page<DebtPayment> searchDebtPayments(
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate,
            @Param("customerId") Integer customerId,
            @Param("staffId") Integer staffId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    List<DebtPayment> findAllByCreatedAtBetween(Instant start, Instant end);
}