package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StockMovement;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Integer> {

    @Query("""
        SELECT COALESCE(SUM(sm.quantityDelta), 0)
        FROM StockMovement sm
        WHERE sm.stockBatch.id = :batchId
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    int sumQuantityDeltaByBatchId(@Param("batchId") Integer batchId);

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.stockBatch.id = :batchId
          AND sm.referenceType = :referenceType
          AND sm.referenceId = :referenceId
          AND sm.movementType = :movementType
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    List<StockMovement> findActiveByBatchReferenceAndType(
            @Param("batchId") Integer batchId,
            @Param("referenceType") String referenceType,
            @Param("referenceId") Integer referenceId,
            @Param("movementType") String movementType
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        WHERE sm.referenceType = :referenceType
          AND sm.referenceId = :referenceId
          AND sm.movementType = :movementType
          AND (sm.isRemoved = false OR sm.isRemoved IS NULL)
        """)
    List<StockMovement> findActiveByReferenceAndType(
            @Param("referenceType") String referenceType,
            @Param("referenceId") Integer referenceId,
            @Param("movementType") String movementType
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        JOIN FETCH sm.stockBatch sb
        JOIN FETCH sb.product p
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType IN :types
          AND (:fromInstant IS NULL OR sm.createdAt >= :fromInstant)
          AND (:toInstant IS NULL OR sm.createdAt < :toInstant)
          AND (:productIdsEmpty = true OR p.id IN :productIds)
        ORDER BY p.name ASC, p.id ASC, sm.createdAt ASC, sm.id ASC
        """)
    List<StockMovement> findReportMovements(
            @Param("fromInstant") Instant fromInstant,
            @Param("toInstant") Instant toInstant,
            @Param("types") Collection<String> types,
            @Param("productIds") Collection<Integer> productIds,
            @Param("productIdsEmpty") boolean productIdsEmpty
    );

    @Query("""
        SELECT sm FROM StockMovement sm
        JOIN FETCH sm.stockBatch sb
        JOIN FETCH sb.product p
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType IN :types
          AND sm.createdAt < :before
          AND (:productIdsEmpty = true OR p.id IN :productIds)
        ORDER BY p.id ASC, sm.createdAt ASC, sm.id ASC
        """)
    List<StockMovement> findMovementsBefore(
            @Param("before") Instant before,
            @Param("types") Collection<String> types,
            @Param("productIds") Collection<Integer> productIds,
            @Param("productIdsEmpty") boolean productIdsEmpty
    );

    // ═══════════════════════ Revenue Report — COGS ═══════════════════════

    /**
     * Giá vốn hàng xuất bán trong kỳ: Σ(−quantityDelta × batch.costPerUnit) của movement SALE.
     * costPerUnit tính theo đơn vị cơ sở, khớp với quantityDelta. Dùng movement thay vì
     * SalesOrderDetail.stockBatch vì một dòng bán có thể trừ nhiều lô giá khác nhau.
     *
     * <p>referenceId trỏ đơn bán (SALES_ORDER) hoặc phiếu trả (EXCHANGE_ORDER — hàng
     * khách đổi ra), nên bộ lọc PTTT/nhân viên phải đi qua đúng chứng từ tương ứng.
     */
    @Query("""
        SELECT COALESCE(SUM(-sm.quantityDelta * sb.costPerUnit), 0)
        FROM StockMovement sm
        JOIN sm.stockBatch sb
        LEFT JOIN SalesOrder so
               ON sm.referenceType = 'SALES_ORDER' AND so.id = sm.referenceId
        LEFT JOIN ReturnOrder ro
               ON sm.referenceType = 'EXCHANGE_ORDER' AND ro.id = sm.referenceId
        LEFT JOIN ro.salesOrder rso
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType = 'SALE'
          AND sm.createdAt >= :from
          AND sm.createdAt < :to
          AND (so.id IS NULL OR so.orderStatus <> 'CANCELLED')
          AND (:allMethods = true
               OR (CASE WHEN so.id IS NOT NULL THEN (CASE WHEN so.isDebt = true THEN 'DEBT' ELSE COALESCE(so.paymentMethod, 'CASH') END) ELSE (CASE WHEN rso.isDebt = true THEN 'DEBT' ELSE COALESCE(rso.paymentMethod, 'CASH') END) END) IN :methods)
          AND (:staffId IS NULL OR COALESCE(so.createdBy, ro.createdBy) = :staffId)
        """)
    BigDecimal sumRevenueSaleCogs(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId);

    /**
     * Giá vốn của hàng khách trả trong kỳ, cộng lại vào kho: Σ(quantityDelta × costPerUnit).
     * Tính cả RETURN (hàng bán lại được) lẫn RETURN_HOLD_IN (hàng lỗi vào khu đổi trả),
     * vì doanh thu đã trừ toàn bộ refund của cả hai loại.
     */
    @Query("""
        SELECT COALESCE(SUM(sm.quantityDelta * sb.costPerUnit), 0)
        FROM StockMovement sm
        JOIN sm.stockBatch sb
        JOIN ReturnOrder ro ON ro.id = sm.referenceId
        LEFT JOIN ro.salesOrder rso
        WHERE (sm.isRemoved = false OR sm.isRemoved IS NULL)
          AND sm.movementType IN ('RETURN', 'RETURN_HOLD_IN')
          AND sm.referenceType = 'RETURN_ORDER'
          AND sm.createdAt >= :from
          AND sm.createdAt < :to
          AND (:allMethods = true OR (CASE WHEN rso.isDebt = true THEN 'DEBT' ELSE COALESCE(rso.paymentMethod, 'CASH') END) IN :methods)
          AND (:staffId IS NULL OR ro.createdBy = :staffId)
        """)
    BigDecimal sumRevenueReturnCogs(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId);
}
