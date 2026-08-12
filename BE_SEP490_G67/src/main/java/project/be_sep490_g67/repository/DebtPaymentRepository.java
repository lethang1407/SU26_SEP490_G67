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
import java.util.Collection;
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

    /**
     * Tổng tiền đã trả nợ của từng hóa đơn trong danh sách. Trả về từng dòng
     * [salesOrderId, tổng tiền] để một trang lịch sử chỉ tốn một query thay vì
     * lazy-load {@code salesOrder.debtPayments} cho mỗi dòng.
     * Hóa đơn chưa có lần trả nợ nào sẽ không xuất hiện trong kết quả.
     */
    @Query("""
            SELECT dp.salesOrder.id, COALESCE(SUM(dp.amountPaid), 0)
            FROM DebtPayment dp
            WHERE dp.salesOrder.id IN :salesOrderIds
              AND dp.isRemoved = false
            GROUP BY dp.salesOrder.id
            """)
    List<Object[]> sumPaidBySalesOrderIds(@Param("salesOrderIds") Collection<Integer> salesOrderIds);

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