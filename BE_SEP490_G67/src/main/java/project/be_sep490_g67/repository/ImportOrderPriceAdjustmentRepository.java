package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrderPriceAdjustment;

import java.util.List;

@Repository
public interface ImportOrderPriceAdjustmentRepository extends JpaRepository<ImportOrderPriceAdjustment, Integer> {

    @Query("""
            SELECT a FROM ImportOrderPriceAdjustment a
            JOIN FETCH a.product
            JOIN FETCH a.productUnit
            WHERE a.importOrder.id = :orderId
              AND (a.isRemoved = false OR a.isRemoved IS NULL)
            ORDER BY a.id ASC
            """)
    List<ImportOrderPriceAdjustment> findByImportOrder_IdAndIsRemovedFalse(@Param("orderId") Integer orderId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ImportOrderPriceAdjustment a WHERE a.importOrder.id = :orderId")
    void deleteByImportOrderId(@Param("orderId") Integer orderId);
}
