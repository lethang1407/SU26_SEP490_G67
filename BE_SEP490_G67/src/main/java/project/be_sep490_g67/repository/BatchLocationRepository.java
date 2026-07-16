package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.BatchLocation;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchLocationRepository extends JpaRepository<BatchLocation, Integer> {

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            WHERE bl.id = :id
              AND bl.isRemoved = false
            """)
    Optional<BatchLocation> findActiveWithDetailsById(@Param("id") Integer id);

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            WHERE bl.location.id = :locationId
              AND bl.isRemoved = false
              AND bl.quantity > 0
            """)
    List<BatchLocation> findActiveByLocationId(@Param("locationId") Integer locationId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.location.id = :locationId
              AND bl.isRemoved = false
            """)
    Optional<BatchLocation> findActiveByBatchIdAndLocationId(
            @Param("batchId") Integer batchId,
            @Param("locationId") Integer locationId);

    @Query("""
            SELECT COALESCE(SUM(bl.quantity), 0)
            FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
            """)
    Integer sumQuantityByBatchId(@Param("batchId") Integer batchId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            JOIN FETCH bl.batch b
            JOIN FETCH b.product p
            JOIN FETCH bl.location loc
            WHERE bl.isRemoved = false
              AND bl.quantity > 0
              AND loc.isRemoved = false
              AND (:locationLabel IS NULL OR :locationLabel = '' OR :locationLabel = 'all'
                   OR loc.label = :locationLabel)
            ORDER BY loc.label ASC, b.id ASC
            """)
    List<BatchLocation> findActiveAvailableLines(@Param("locationLabel") String locationLabel);
}
