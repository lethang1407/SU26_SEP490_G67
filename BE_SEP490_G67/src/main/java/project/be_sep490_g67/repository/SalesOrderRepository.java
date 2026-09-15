package project.be_sep490_g67.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.SalesOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;


public interface SalesOrderRepository extends JpaRepository<SalesOrder, Integer> {
    @Query("SELECT o FROM SalesOrder o WHERE o.id = :id AND o.isRemoved = false")
    Optional<SalesOrder> findActiveById(@Param("id") Integer id);

    @Query("SELECT o.createdBy FROM SalesOrder o WHERE o.id = :id AND o.isRemoved = false")
    Optional<Integer> findCreatedById(@Param("id") Integer id);

    @Query("""
            SELECT o FROM SalesOrder o
            WHERE o.originalSalesOrderId IN :originalIds
              AND o.isRemoved = false
            ORDER BY o.createdAt ASC, o.id ASC
            """)
    List<SalesOrder> findByOriginalSalesOrderIds(@Param("originalIds") List<Integer> originalIds);

    @Query("""
            SELECT o FROM SalesOrder o
            LEFT JOIN FETCH o.salesOrderDetails d
            LEFT JOIN FETCH d.product
            WHERE o.originalSalesOrderId = :originalId
              AND o.isRemoved = false
            ORDER BY o.createdAt ASC, o.id ASC
            """)
    List<SalesOrder> findByOriginalSalesOrderIdWithDetails(@Param("originalId") Integer originalId);

    @Query("""
            SELECT o FROM SalesOrder o
            LEFT JOIN o.customer c
            WHERE o.isRemoved = false
              AND o.originalSalesOrderId IS NULL
              AND (:createdBy IS NULL OR o.createdBy = :createdBy)
              AND (:search IS NULL
                    OR LOWER(o.orderCode) LIKE :search
                    OR LOWER(c.fullName) LIKE :search
                    OR c.phoneNumber LIKE :search
                    OR EXISTS (
                        SELECT 1 FROM SalesOrderDetail ds
                        WHERE ds.salesOrder = o
                          AND (LOWER(ds.product.name) LIKE :search
                               OR LOWER(ds.product.barcode) LIKE :search)))
              AND (:orderCode IS NULL OR LOWER(o.orderCode) LIKE :orderCode)
              AND (:customer IS NULL OR LOWER(c.fullName) LIKE :customer OR c.phoneNumber LIKE :customer)
              AND (:product IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d
                    WHERE d.salesOrder = o
                      AND (LOWER(d.product.name) LIKE :product OR LOWER(d.product.barcode) LIKE :product)))
              AND (:dateFrom IS NULL OR o.createdAt >= :dateFrom)
              AND (:dateTo   IS NULL OR o.createdAt <= :dateTo)
              AND (:orderStatus IS NULL OR o.orderStatus = :orderStatus)
              AND (:paymentMethod IS NULL OR o.paymentMethod = :paymentMethod)
              AND (:isDebt IS NULL OR o.isDebt = :isDebt)
            ORDER BY o.createdAt DESC, o.id DESC
            """)
    Page<SalesOrder> findHistory(@Param("createdBy") Integer createdBy,
                                 @Param("search") String search,
                                 @Param("orderCode") String orderCode,
                                 @Param("customer") String customer,
                                 @Param("product") String product,
                                 @Param("dateFrom") Instant dateFrom,
                                 @Param("dateTo") Instant dateTo,
                                 @Param("orderStatus") String orderStatus,
                                 @Param("paymentMethod") String paymentMethod,
                                 @Param("isDebt") Boolean isDebt,
                                 Pageable pageable);

    @Query("""
            SELECT DISTINCT o FROM SalesOrder o
            LEFT JOIN o.customer c
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND (:orderCode IS NULL OR LOWER(o.orderCode) LIKE :orderCode)
              AND (:customerPhone IS NULL OR c.phoneNumber LIKE :customerPhone)
              AND (:customerName IS NULL OR LOWER(c.fullName) LIKE :customerName)
              AND (:from IS NULL OR o.createdAt >= :from)
              AND (:to   IS NULL OR o.createdAt <= :to)
              AND (:productId IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d
                    WHERE d.salesOrder = o AND d.isRemoved = false
                      AND d.product.id = :productId))
              AND (:barcode IS NULL OR EXISTS (
                    SELECT 1 FROM SalesOrderDetail d2
                    WHERE d2.salesOrder = o AND d2.isRemoved = false
                      AND LOWER(d2.product.barcode) = :barcode))
              AND (:amountMin IS NULL OR o.totalAmount >= :amountMin)
              AND (:amountMax IS NULL OR o.totalAmount <= :amountMax)
            ORDER BY o.createdAt DESC
            """)
    Page<SalesOrder> searchForReturn(@Param("orderCode") String orderCode,
                                     @Param("customerPhone") String customerPhone,
                                     @Param("customerName") String customerName,
                                     @Param("from") Instant from,
                                     @Param("to") Instant to,
                                     @Param("productId") Integer productId,
                                     @Param("barcode") String barcode,
                                     @Param("amountMin") BigDecimal amountMin,
                                     @Param("amountMax") BigDecimal amountMax,
                                     Pageable pageable);

    @Query("SELECT o FROM SalesOrder o LEFT JOIN FETCH o.customer LEFT JOIN FETCH o.salesOrderDetails WHERE o.id = :id AND o.isRemoved = false")
    Optional<SalesOrder> findByIdWithDetails(@Param("id") Integer id);

    @Query(
            value = """
                    SELECT so
                    FROM SalesOrder so
                    WHERE so.customer.id = :customerId
                      AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
                    ORDER BY
                        CASE
                            WHEN so.totalAmount >
                                 (
                                     COALESCE(so.paidAmount, 0)
                                     +
                                     COALESCE(
                                         (
                                             SELECT SUM(dp.amountPaid)
                                             FROM DebtPayment dp
                                             WHERE dp.salesOrder = so
                                               AND dp.isRemoved = false
                                         ),
                                         0
                                     )
                                 )
                                 AND so.dueDate IS NOT NULL
                                 AND so.dueDate < :now
                            THEN 1
                    
                            WHEN so.totalAmount >
                                 (
                                     COALESCE(so.paidAmount, 0)
                                     +
                                     COALESCE(
                                         (
                                             SELECT SUM(dp.amountPaid)
                                             FROM DebtPayment dp
                                             WHERE dp.salesOrder = so
                                               AND dp.isRemoved = false
                                         ),
                                         0
                                     )
                                 )
                            THEN 2
                    
                            ELSE 3
                        END,
                        so.createdAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(so)
                    FROM SalesOrder so
                    WHERE so.customer.id = :customerId
                      AND (:keyword IS NULL OR so.orderCode LIKE %:keyword%)
                    """
    )
    Page<SalesOrder> findDebtOrdersByCustomerIdWithPriority(
            @Param("customerId") Integer customerId,
            @Param("keyword") String keyword,
            @Param("now") Instant now,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(so) > 0 FROM SalesOrder so
            WHERE so.customer.id = :customerId
              AND so.isDebt = true
              AND so.isRemoved = false
            """)
    boolean existsDebtOrderByCustomerId(@Param("customerId") Integer customerId);

    @Query("""
            SELECT so FROM SalesOrder so
            WHERE so.customer.id = :customerId
              AND so.isDebt = true
              AND so.isRemoved = false
              AND so.dueDate IS NOT NULL
              AND so.dueDate < :now
            """)
    List<SalesOrder> findOverdueDebtOrdersByCustomerId(
            @Param("customerId") Integer customerId,
            @Param("now") Instant now);

    @Query("""
            SELECT c.id, c.fullName,
                   (so.totalAmount - COALESCE(so.paidAmount, 0)
                    - COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp
                                WHERE dp.salesOrder = so AND dp.isRemoved = false), 0))
            FROM SalesOrder so
            JOIN so.customer c
            WHERE so.isRemoved = false
              AND so.isDebt = true
              AND so.dueDate IS NOT NULL
              AND so.dueDate < :now
              AND so.totalAmount > (
                    COALESCE(so.paidAmount, 0)
                    + COALESCE((SELECT SUM(dp.amountPaid) FROM DebtPayment dp
                                WHERE dp.salesOrder = so AND dp.isRemoved = false), 0))
            ORDER BY so.dueDate ASC, so.id ASC
            """)
    List<Object[]> findAllOverdueUnpaidDebtOrders(@Param("now") Instant now);

    @Query("""
            SELECT DISTINCT so FROM SalesOrder so
            LEFT JOIN FETCH so.customer
            LEFT JOIN FETCH so.debtPayments
            WHERE so.isRemoved = false
              AND so.isDebt = true
              AND so.createdAt >= :start
              AND so.createdAt < :end
            ORDER BY so.createdAt DESC
            """)
    List<SalesOrder> findActiveDebtSalesCreatedBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT DISTINCT so FROM SalesOrder so
            LEFT JOIN FETCH so.customer
            LEFT JOIN FETCH so.debtPayments
            WHERE so.id IN :ids
              AND so.isRemoved = false
              AND so.isDebt = true
            """)
    List<SalesOrder> findActiveDebtOrdersByIdsWithPayments(@Param("ids") List<Integer> ids);

    @Query("""
            SELECT COALESCE(SUM(so.paidAmount), 0)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.orderStatus <> 'CANCELLED'
              AND (so.paymentMethod = 'CASH' OR so.paymentMethod IS NULL)
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    BigDecimal sumCashSalesBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COALESCE(SUM(so.paidAmount), 0)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.orderStatus <> 'CANCELLED'
              AND (so.paymentMethod = 'BANK' OR so.paymentMethod = 'BANK_TRANSFER' OR so.paymentMethod = 'TRANSFER')
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    BigDecimal sumBankSalesBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COALESCE(SUM(so.totalAmount - so.paidAmount), 0)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.orderStatus <> 'CANCELLED'
              AND so.isDebt = true
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    BigDecimal sumDebtSalesBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COUNT(so)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    long countTotalOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COUNT(so)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.orderStatus = 'COMPLETED'
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    long countCompletedOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COUNT(so)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.orderStatus = 'CANCELLED'
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    long countCancelledOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT COUNT(so)
            FROM SalesOrder so
            WHERE so.isRemoved = false
              AND so.isDebt = true
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    long countDebtOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT so FROM SalesOrder so
            LEFT JOIN FETCH so.customer
            WHERE so.isRemoved = false
              AND so.createdAt >= :start AND so.createdAt < :end
            ORDER BY so.createdAt DESC
            """)
    List<SalesOrder> findOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            SELECT so.originalSalesOrderId, so.paymentMethod
            FROM SalesOrder so
            WHERE so.originalSalesOrderId IN :originalOrderIds
              AND so.isRemoved = false
              AND so.orderStatus <> 'CANCELLED'
              AND so.createdAt >= :start AND so.createdAt < :end
            """)
    List<Object[]> findExchangeOrderPaymentMethods(
            @Param("originalOrderIds") List<Integer> originalOrderIds,
            @Param("start") Instant start,
            @Param("end") Instant end);

    // Revenue Report
    // Mọi query nhận cùng bộ lọc: allMethods = true thì bỏ qua :methods (vẫn phải truyền
    // list khác rỗng vì IN () không hợp lệ). Nhóm PTTT: đơn bán nợ (isDebt) là DEBT bất kể
    // paymentMethod; đơn chưa ghi PTTT coi là tiền mặt, giống sumCashSalesBetween.

    /**
     * Tổng hợp đơn bán trong kỳ. Một dòng duy nhất:
     * [Σ totalAmount, Σ CK hóa đơn, số đơn có doanh thu (totalAmount > 0),
     *  totalAmount lớn nhất, totalAmount nhỏ nhất trong các đơn có doanh thu].
     * Đơn đổi trả 0đ vẫn cộng vào tổng (bằng 0) nhưng không được đếm là một đơn.
     */
    @Query("""
            SELECT COALESCE(SUM(o.totalAmount), 0),
                   COALESCE(SUM(o.discountAmount), 0),
                   COUNT(CASE WHEN o.totalAmount > 0 THEN 1 END),
                   MAX(CASE WHEN o.totalAmount > 0 THEN o.totalAmount END),
                   MIN(CASE WHEN o.totalAmount > 0 THEN o.totalAmount END)
            FROM SalesOrder o
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND o.createdAt >= :from
              AND o.createdAt < :to
              AND (:allMethods = true OR (CASE WHEN o.isDebt = true THEN 'DEBT' ELSE COALESCE(o.paymentMethod, 'CASH') END) IN :methods)
              AND (:staffId IS NULL OR o.createdBy = :staffId)
            """)
    List<Object[]> sumRevenueOrderTotals(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId);

    /**
     * Doanh thu theo phương thức thanh toán — tab PTTT.
     * Mỗi phần tử: [nhóm PTTT (đơn bán nợ = DEBT, chưa ghi PTTT = CASH), Σ totalAmount, số đơn có doanh thu].
     */
    @Query("""
            SELECT (CASE WHEN o.isDebt = true THEN 'DEBT' ELSE COALESCE(o.paymentMethod, 'CASH') END),
                   COALESCE(SUM(o.totalAmount), 0),
                   COUNT(CASE WHEN o.totalAmount > 0 THEN 1 END)
            FROM SalesOrder o
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND o.createdAt >= :from
              AND o.createdAt < :to
              AND (:allMethods = true OR (CASE WHEN o.isDebt = true THEN 'DEBT' ELSE COALESCE(o.paymentMethod, 'CASH') END) IN :methods)
              AND (:staffId IS NULL OR o.createdBy = :staffId)
            GROUP BY (CASE WHEN o.isDebt = true THEN 'DEBT' ELSE COALESCE(o.paymentMethod, 'CASH') END)
            """)
    List<Object[]> sumRevenueByPaymentMethod(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId);

    /**
     * Phiếu bán trong kỳ cho bảng chi tiết giao dịch: đơn gốc, cùng đơn đổi có tiền
     * (hàng khách đổi ra được tính doanh thu). Đơn đổi 0đ chỉ là vỏ chứng từ nên bỏ qua.
     */
    @Query("""
            SELECT o FROM SalesOrder o
            LEFT JOIN FETCH o.customer c
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND (o.originalSalesOrderId IS NULL OR o.totalAmount > 0)
              AND o.createdAt >= :from
              AND o.createdAt < :to
              AND (:allMethods = true OR (CASE WHEN o.isDebt = true THEN 'DEBT' ELSE COALESCE(o.paymentMethod, 'CASH') END) IN :methods)
              AND (:staffId IS NULL OR o.createdBy = :staffId)
              AND (:keyword IS NULL OR :keyword = ''
                   OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(COALESCE(c.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY o.createdAt DESC, o.id DESC
            """)
    List<SalesOrder> findRevenueTransactions(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId,
            @Param("keyword") String keyword);

    /**
     * Đơn bán nợ trong kỳ, để tính phần còn nợ chưa thu.
     * Mỗi phần tử: [id, totalAmount, paidAmount (trả trước lúc mua)].
     */
    @Query("""
            SELECT o.id, o.totalAmount, o.paidAmount
            FROM SalesOrder o
            WHERE o.isRemoved = false
              AND o.orderStatus <> 'CANCELLED'
              AND o.isDebt = true
              AND o.totalAmount > 0
              AND o.createdAt >= :from
              AND o.createdAt < :to
              AND (:allMethods = true OR 'DEBT' IN :methods)
              AND (:staffId IS NULL OR o.createdBy = :staffId)
            """)
    List<Object[]> findRevenueDebtOrders(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("allMethods") boolean allMethods,
            @Param("methods") List<String> methods,
            @Param("staffId") Integer staffId);
}
