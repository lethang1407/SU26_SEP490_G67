package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.PriceHistory;

import java.util.List;

@Repository
public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Integer> {
    @Query("SELECT ph FROM PriceHistory ph WHERE ph.product.id = :productId AND ph.isRemoved = false ORDER BY ph.createdAt ASC")
    List<PriceHistory> findByProductIdOrderByCreatedAtAsc(Integer productId);
}
