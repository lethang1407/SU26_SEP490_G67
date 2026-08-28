package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.RestockAdviceDismissal;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RestockAdviceDismissalRepository
        extends JpaRepository<RestockAdviceDismissal, Integer> {

    /** Các sản phẩm đã bị bỏ qua trong ngày — widget loại chúng ra khỏi kết quả. */
    @Query("""
            SELECT d.product.id FROM RestockAdviceDismissal d
            WHERE d.dismissedOn = :day AND d.isRemoved = false
            """)
    List<Integer> findProductIdsDismissedOn(@Param("day") LocalDate day);

    Optional<RestockAdviceDismissal> findByProduct_IdAndDismissedOn(Integer productId, LocalDate dismissedOn);
}
