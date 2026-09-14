package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportTrialSettlementLine;

@Repository
public interface ImportTrialSettlementLineRepository extends JpaRepository<ImportTrialSettlementLine, Integer> {
}
