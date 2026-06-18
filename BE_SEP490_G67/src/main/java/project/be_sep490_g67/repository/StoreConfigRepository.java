package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StoreConfig;

import java.util.Optional;

@Repository
public interface StoreConfigRepository extends JpaRepository<StoreConfig, Integer> {
    Optional<StoreConfig> findById (Integer id);
}
