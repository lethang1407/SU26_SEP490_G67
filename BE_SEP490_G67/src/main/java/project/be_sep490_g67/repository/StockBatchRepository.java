package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockBatch;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface StockBatchRepository extends JpaRepository<StockBatch, Integer> {

    @Query("""
        SELECT MIN(b.expiryDate)
        FROM StockBatch b
        WHERE b.product.id = :productId
          AND b.expiryDate IS NOT NULL
          AND b.expiryDate >= :today
          AND (b.isRemoved = false OR b.isRemoved IS NULL)
        """)
    Optional<LocalDate> findNearestExpiry(
            @Param("productId") Integer productId,
            @Param("today") LocalDate today);
}
