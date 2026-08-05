package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrderDetail;

@Repository
public interface ImportOrderDetailRepository extends JpaRepository<ImportOrderDetail, Integer> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM ImportOrderDetail d WHERE d.importOrder.id = :orderId")
    void deleteByImportOrderId(@Param("orderId") Integer orderId);
}
