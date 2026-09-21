package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StoreConfig;

import java.util.Optional;

@Repository
public interface StoreConfigRepository extends JpaRepository<StoreConfig, Integer> {
    /** Shared lock for all profile/year writers, including the first profile. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select s from StoreConfig s where s.id = :id")
    Optional<StoreConfig> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    Optional<StoreConfig> findById(Integer id);

    /** Fetch the single store-config row (table is expected to have exactly one row). */
    Optional<StoreConfig> findFirstByOrderByIdAsc();
}
