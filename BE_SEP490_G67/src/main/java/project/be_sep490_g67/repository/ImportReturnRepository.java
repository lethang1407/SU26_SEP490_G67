package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.ImportReturn;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ImportReturnRepository extends JpaRepository<ImportReturn, Integer> {

    @Query("""
            SELECT ir FROM ImportReturn ir
            WHERE ir.createdBy = :userId
              AND ir.status = :status
              AND (ir.isRemoved = false OR ir.isRemoved IS NULL)
            ORDER BY ir.id DESC
            LIMIT 1
            """)
    Optional<ImportReturn> findLatestByCreatedByAndStatus(
            @Param("userId") Integer userId,
            @Param("status") String status);

    @Query("""
            SELECT ir FROM ImportReturn ir
            WHERE ir.createdBy = :userId
              AND ir.status = :status
              AND ir.source = :source
              AND (ir.isRemoved = false OR ir.isRemoved IS NULL)
            ORDER BY ir.id DESC
            LIMIT 1
            """)
    Optional<ImportReturn> findLatestByCreatedByAndStatusAndSource(
            @Param("userId") Integer userId,
            @Param("status") String status,
            @Param("source") String source);

    @Query("""
            SELECT ir FROM ImportReturn ir
            WHERE ir.id = :id
              AND (ir.isRemoved = false OR ir.isRemoved IS NULL)
            """)
    Optional<ImportReturn> findActiveById(@Param("id") Integer id);

    @Query("""
            SELECT ir FROM ImportReturn ir
            WHERE (ir.isRemoved = false OR ir.isRemoved IS NULL)
              AND (:status IS NULL OR ir.status = :status)
              AND (:statusesEmpty = true OR ir.status IN :statuses)
              AND (:source IS NULL OR ir.source = :source)
              AND (:fromTime IS NULL OR ir.createdAt >= :fromTime)
              AND (:toTime IS NULL OR ir.createdAt <= :toTime)
              AND (
                    :q IS NULL OR :q = ''
                    OR LOWER(COALESCE(ir.returnCode, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                  )
            ORDER BY ir.id DESC
            """)
    Page<ImportReturn> search(
            @Param("status") String status,
            @Param("statuses") List<String> statuses,
            @Param("statusesEmpty") boolean statusesEmpty,
            @Param("source") String source,
            @Param("q") String q,
            @Param("fromTime") Instant fromTime,
            @Param("toTime") Instant toTime,
            Pageable pageable);
}
