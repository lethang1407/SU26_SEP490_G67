package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportTrialSettlement;

import java.util.List;

@Repository
public interface ImportTrialSettlementRepository extends JpaRepository<ImportTrialSettlement, Integer> {

    @Query("""
        SELECT s
        FROM ImportTrialSettlement s
        WHERE s.importOrder.id = :orderId
          AND (s.isRemoved = false OR s.isRemoved IS NULL)
        ORDER BY s.id DESC
        """)
    List<ImportTrialSettlement> findByImportOrderIdWithLines(@Param("orderId") Integer orderId);

    @Query("""
        SELECT s
        FROM ImportTrialSettlement s
        WHERE s.supplier.id = :supplierId
          AND (s.isRemoved = false OR s.isRemoved IS NULL)
        ORDER BY s.id DESC
        """)
    List<ImportTrialSettlement> findBySupplierIdWithLines(@Param("supplierId") Integer supplierId);
}
