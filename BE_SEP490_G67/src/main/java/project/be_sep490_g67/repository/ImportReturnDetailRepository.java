package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.ImportReturnDetail;

import java.util.List;
import java.util.Optional;

public interface ImportReturnDetailRepository extends JpaRepository<ImportReturnDetail, Integer> {

    @Query("""
            SELECT d FROM ImportReturnDetail d
            JOIN FETCH d.product p
            LEFT JOIN FETCH d.stockBatch sb
            LEFT JOIN FETCH d.supplier s
            LEFT JOIN FETCH d.importOrder io
            LEFT JOIN FETCH d.exchangeBatch eb
            WHERE d.importReturn.id = :returnId
              AND (d.isRemoved = false OR d.isRemoved IS NULL)
            ORDER BY d.id ASC
            """)
    List<ImportReturnDetail> findActiveByReturnId(@Param("returnId") Integer returnId);

    @Query("""
            SELECT d FROM ImportReturnDetail d
            JOIN FETCH d.importReturn ir
            JOIN FETCH d.product p
            LEFT JOIN FETCH d.stockBatch sb
            LEFT JOIN FETCH d.exchangeBatch eb
            WHERE d.id = :id
              AND (d.isRemoved = false OR d.isRemoved IS NULL)
            """)
    Optional<ImportReturnDetail> findActiveWithReturnById(@Param("id") Integer id);

    @Query("""
            SELECT d FROM ImportReturnDetail d
            WHERE d.importReturn.id = :returnId
              AND d.stockBatch.id = :batchId
              AND (d.isRemoved = false OR d.isRemoved IS NULL)
            """)
    Optional<ImportReturnDetail> findActiveByReturnIdAndBatchId(
            @Param("returnId") Integer returnId,
            @Param("batchId") Integer batchId);
}
