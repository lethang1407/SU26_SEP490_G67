package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.BatchLocation;

@Repository
public interface BatchLocationRepository extends JpaRepository<BatchLocation, Integer> {

    @Query("""
        SELECT COALESCE(SUM(bl.quantity), 0)
        FROM BatchLocation bl
        JOIN bl.batch b
        WHERE b.product.id = :productId
          AND (bl.isRemoved = false OR bl.isRemoved IS NULL)
          AND (b.isRemoved = false OR b.isRemoved IS NULL)
        """)
    Long sumOnHandByProductId(@Param("productId") Integer productId);
}
