package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrder;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportOrderRepository extends JpaRepository<ImportOrder, Integer> {
    @Query("""
            SELECT io FROM ImportOrder io
            WHERE io.isRemoved = false
              AND io.supplier.isRemoved = false
            """)
    List<ImportOrder> findAllActiveWithActiveSupplier();

    @Query("""
            SELECT io FROM ImportOrder io
            WHERE io.supplier.id = :supplierId
              AND io.isRemoved = false
              AND (:search IS NULL OR :search = ''
                   OR LOWER(io.orderCode) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY io.receivedDate DESC, io.id DESC
            """)
    List<ImportOrder> searchBySupplier(@Param("supplierId") Integer supplierId, @Param("search") String search);

    @Query("""
            SELECT DISTINCT io FROM ImportOrder io
            LEFT JOIN FETCH io.importOrderDetails iod
            LEFT JOIN FETCH iod.product
            WHERE io.id = :id
              AND io.isRemoved = false
            """)
    Optional<ImportOrder> findDetailById(@Param("id") Integer id);
}
