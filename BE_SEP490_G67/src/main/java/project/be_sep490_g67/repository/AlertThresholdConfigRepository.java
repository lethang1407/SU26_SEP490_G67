package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.AlertThresholdConfig;

import java.util.Optional;

@Repository
public interface AlertThresholdConfigRepository extends JpaRepository<AlertThresholdConfig, Integer> {

    /** Bảng chỉ có một dòng, giống store_config. */
    Optional<AlertThresholdConfig> findFirstByOrderByIdAsc();
}
