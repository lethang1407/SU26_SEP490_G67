package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StorageZone;

import java.util.List;
import java.util.Optional;

@Repository
public interface StorageZoneRepository extends JpaRepository<StorageZone, Integer> {

    Optional<StorageZone> findByCodeIgnoreCaseAndIsRemovedFalse(String code);

    boolean existsByCodeIgnoreCaseAndIsRemovedFalse(String code);

    @Query("""
            SELECT z FROM StorageZone z
            WHERE z.isRemoved = false OR z.isRemoved IS NULL
            ORDER BY
                CASE WHEN z.zoneType = 'RETURN_HOLD' THEN 1 ELSE 0 END,
                z.sortOrder ASC,
                z.code ASC
            """)
    List<StorageZone> findAllActiveOrdered();

    @Query("""
            SELECT z.code FROM StorageZone z
            WHERE (z.isRemoved = false OR z.isRemoved IS NULL)
              AND z.zoneType = :zoneType
            """)
    List<String> findCodesByZoneType(@Param("zoneType") String zoneType);
}
