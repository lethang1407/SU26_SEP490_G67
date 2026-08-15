package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.AuditResolution;
import java.util.Optional;

@Repository
public interface AuditResolutionRepository extends JpaRepository<AuditResolution, Integer> {
    Optional<AuditResolution> findByAnomalyTypeAndTargetId(String anomalyType, String targetId);
}
