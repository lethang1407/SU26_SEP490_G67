package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StorageLocation;

import java.util.List;
import java.util.Optional;

@Repository
public interface StorageLocationRepository extends JpaRepository<StorageLocation, Integer> {

    Optional<StorageLocation> findFirstByIsRemovedFalseAndIsActiveTrueOrderByIdAsc();
    @Query("""
            SELECT DISTINCT sl
            FROM StorageLocation sl
            LEFT JOIN FETCH sl.batchLocations bl
            LEFT JOIN FETCH bl.batch b
            LEFT JOIN FETCH b.product p
            WHERE sl.isRemoved = false
              AND (sl.isActive = true OR sl.isActive IS NULL)
            ORDER BY sl.zone ASC, sl.label ASC
            """)
    List<StorageLocation> findAllActiveWithContents();

    @Query("""
            SELECT DISTINCT sl
            FROM StorageLocation sl
            LEFT JOIN FETCH sl.batchLocations bl
            LEFT JOIN FETCH bl.batch b
            LEFT JOIN FETCH b.product p
            WHERE sl.id = :id
              AND sl.isRemoved = false
              AND (sl.isActive = true OR sl.isActive IS NULL)
            """)
    Optional<StorageLocation> findActiveWithContentsById(Integer id);

    boolean existsByLabelIgnoreCaseAndIsRemovedFalse(String label);

    boolean existsByZoneIgnoreCaseAndShelfAndBinAndIsRemovedFalse(
            String zone, String shelf, String bin);
}
