package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.DebtPayment;

import java.math.BigDecimal;
import java.time.Instant;

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
}
