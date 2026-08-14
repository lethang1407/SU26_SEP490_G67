package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.DailyReconciliation;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyReconciliationRepository extends JpaRepository<DailyReconciliation, Integer> {
    Optional<DailyReconciliation> findByReconciliationDate(LocalDate date);
}
