package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.InventoryCheck;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryCheckRepository extends JpaRepository<InventoryCheck, Integer> {

    @Query("""
            SELECT ic FROM InventoryCheck ic
            WHERE ic.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(ic.checkCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(COALESCE(ic.note, '')) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:status IS NULL OR :status = '' OR :status = 'all' OR ic.status = :status)
            ORDER BY ic.checkDate DESC, ic.id DESC
            """)
    List<InventoryCheck> search(@Param("search") String search, @Param("status") String status);

    @Query("""
            SELECT DISTINCT ic FROM InventoryCheck ic
            LEFT JOIN FETCH ic.details d
            LEFT JOIN FETCH d.batchLocation bl
            LEFT JOIN FETCH bl.batch b
            LEFT JOIN FETCH b.product p
            LEFT JOIN FETCH bl.location loc
            WHERE ic.id = :id
              AND ic.isRemoved = false
            """)
    Optional<InventoryCheck> findDetailById(@Param("id") Integer id);
}
