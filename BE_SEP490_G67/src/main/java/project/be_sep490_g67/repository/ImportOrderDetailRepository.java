package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ImportOrderDetail;

import java.time.Instant;
import java.util.List;

@Repository
public interface ImportOrderDetailRepository extends JpaRepository<ImportOrderDetail, Integer> {

    @Query("""
        SELECT d FROM ImportOrderDetail d
        JOIN FETCH d.importOrder o
        JOIN FETCH o.supplier s
        JOIN FETCH d.product p
        WHERE (d.isRemoved = false OR d.isRemoved IS NULL)
          AND (o.isRemoved = false OR o.isRemoved IS NULL)
          AND (p.isRemoved = false OR p.isRemoved IS NULL)
          AND o.createdAt >= :from
          AND o.createdAt < :to
          AND (:productId IS NULL OR p.id = :productId)
          AND (:status IS NULL OR :status = '' OR UPPER(o.status) = UPPER(:status))
          AND (:supplierKeyword IS NULL OR :supplierKeyword = ''
               OR LOWER(s.name) LIKE LOWER(CONCAT('%', :supplierKeyword, '%'))
               OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :supplierKeyword, '%')))
        ORDER BY o.createdAt DESC, d.id DESC
        """)
    List<ImportOrderDetail> findHistoryRows(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("productId") Integer productId,
            @Param("status") String status,
            @Param("supplierKeyword") String supplierKeyword);
}
