package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StorageLocation;

import java.util.Optional;

@Repository
public interface StorageLocationRepository extends JpaRepository<StorageLocation, Integer> {

    Optional<StorageLocation> findFirstByIsRemovedFalseAndIsActiveTrueOrderByIdAsc();
}
