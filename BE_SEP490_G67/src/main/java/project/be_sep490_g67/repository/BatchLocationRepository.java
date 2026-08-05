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

    @Query(
            """
                    SELECT bl from BatchLocation bl
                    JOIN fetch bl.batch sb
                    JOIN FETCH bl.location ls
                    WHERE sb.product.id = :productId AND bl.quantity > 0
                    AND bl.isRemoved = false
                    AND  sb.isRemoved = false 
                    AND ls.isRemoved = false 
                    ORDER BY sb.expiryDate ASC, sb.receivedDate ASC 
                    """
    )
    List<BatchLocation> findAvailableByProductId(@Param("productId") Integer productId);

    @Query("""
            SELECT bl FROM BatchLocation bl
            WHERE bl.batch.id = :batchId
              AND bl.isRemoved = false
            ORDER BY bl.quantity DESC, bl.id ASC
            LIMIT 1
            """)
    Optional<BatchLocation> findFirstByBatchId(@Param("batchId") Integer batchId);
}
