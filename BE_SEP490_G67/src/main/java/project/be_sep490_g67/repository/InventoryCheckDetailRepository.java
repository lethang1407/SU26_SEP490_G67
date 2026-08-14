package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.InventoryCheckDetail;

import java.time.Instant;
import java.util.List;

@Repository
public interface InventoryCheckDetailRepository extends JpaRepository<InventoryCheckDetail, Integer> {

    @Query("""
            SELECT d.product.id, MAX(ic.checkDate)
            FROM InventoryCheckDetail d
            JOIN d.inventoryCheck ic
            WHERE d.isRemoved = false
              AND ic.isRemoved = false
              AND ic.status = 'completed'
              AND d.product.id IN :productIds
            GROUP BY d.product.id
            """)
    List<Object[]> findLastCheckDateByProductIds(@Param("productIds") List<Integer> productIds);

    @Query("""
            SELECT DISTINCT d.product.id
            FROM InventoryCheckDetail d
            JOIN d.inventoryCheck ic
            WHERE d.isRemoved = false
              AND ic.isRemoved = false
              AND ic.status = 'completed'
              AND ic.checkDate >= :since
            """)
    List<Integer> findProductIdsCheckedSince(@Param("since") Instant since);
}
