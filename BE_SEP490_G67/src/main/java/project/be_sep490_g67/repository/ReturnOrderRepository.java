package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.ReturnOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnOrderRepository extends JpaRepository<ReturnOrder, Integer> {

    @Query("SELECT r FROM ReturnOrder r WHERE r.id = :id AND r.isRemoved = false")
    Optional<ReturnOrder> findActiveById(@Param("id") Integer id);

    @Query("SELECT r FROM ReturnOrder r WHERE r.salesOrder.id = :salesOrderId AND r.isRemoved = false ORDER BY r.createdAt ASC")
    List<ReturnOrder> findAllBySalesOrderId(@Param("salesOrderId") Integer salesOrderId);

    @Query("""
            SELECT DISTINCT r FROM ReturnOrder r
            LEFT JOIN FETCH r.returnOrderDetails rd
            LEFT JOIN FETCH rd.product
            LEFT JOIN FETCH rd.salesOrderDetail
            WHERE r.salesOrder.id = :salesOrderId
              AND r.isRemoved = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<ReturnOrder> findAllBySalesOrderIdWithDetails(@Param("salesOrderId") Integer salesOrderId);

    /**
     * Phiếu trả của nhiều hóa đơn cùng lúc (dùng cho lịch sử hóa đơn, tránh N+1).
     * Sắp xếp tăng dần theo thời gian: phiếu cuối cùng của mỗi hóa đơn là phiếu mới nhất.
     */
    @Query("""
            SELECT r FROM ReturnOrder r
            WHERE r.salesOrder.id IN :salesOrderIds
              AND r.isRemoved = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<ReturnOrder> findAllBySalesOrderIds(@Param("salesOrderIds") List<Integer> salesOrderIds);

    /**
     * Tổng giá trị hàng khách trả về trong một khoảng thời gian.
     * Doanh thu bán hàng được ghi nhận ngay lúc lập đơn, và hàng đổi ra lại sinh
     * thêm một đơn bán mới. Nếu không trừ phần hoàn này ra thì phần hàng khách đã trả
     * lại bị tính doanh thu hai lần.
     */
    @Query("""
            SELECT COALESCE(SUM(r.refundAmount), 0)
            FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    BigDecimal sumRefundBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Số phiếu đổi/trả lập trong khoảng thời gian — dùng để biết có nên chú thích hoàn trả hay không.
     */
    @Query("""
            SELECT COUNT(r)
            FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    long countBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Phiếu đổi/trả lập trong khoảng thời gian, để gom theo khung giờ.
     */
    @Query("""
            SELECT r FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    List<ReturnOrder> findBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Tiền mặt thực sự ra khỏi két để hoàn cho khách trong khoảng thời gian.
     * <p>
     * Khác {@code refundAmount}: phần cấn trừ vào công nợ không đụng tới két nên
     * không tính ở đây. Phiếu lập trước V25 chưa tách trường này nên có thể NULL.
     */
    @Query("""
            SELECT COALESCE(SUM(r.cashRefundAmount), 0)
            FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    BigDecimal sumCashRefundBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Phần giá trị hàng trả được cấn thẳng sang đơn đổi, cộng trong khoảng thời gian.
     *
     * <p>Suy ra từ đẳng thức quyết toán trong {@code ExchangeOrderService.settleAgainstDebt}:
     * {@code refundAmount = debtOffset + exchangeCredit + cashRefund}.
     *
     * <p>Số này bị đơn đổi ghi vào {@code paidAmount} nên lọt vào tổng tiền bán, dù nó
     * chưa bao giờ là tiền vào két — phải trừ ra khi tính tiền thực thu.
     */
    @Query("""
            SELECT COALESCE(SUM(
                COALESCE(r.refundAmount, 0)
                - COALESCE(r.debtOffsetAmount, 0)
                - COALESCE(r.cashRefundAmount, 0)), 0)
            FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    BigDecimal sumExchangeCreditBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Cùng số tiền như {@link #sumExchangeCreditBetween}, nhưng tách theo từng phiếu trả
     * kèm id đơn gốc — để bên gọi tra ra đơn đổi và biết khoản này đang nằm trong
     * tiền mặt hay chuyển khoản.
     * <p>
     * Mỗi phần tử: {@code [idĐơnGốc, giáTrịCấnSangĐơnĐổi]}.
     */
    @Query("""
            SELECT r.salesOrder.id,
                   COALESCE(r.refundAmount, 0)
                   - COALESCE(r.debtOffsetAmount, 0)
                   - COALESCE(r.cashRefundAmount, 0)
            FROM ReturnOrder r
            WHERE r.isRemoved = false
              AND r.createdAt >= :from
              AND r.createdAt < :to
            """)
    List<Object[]> findExchangeCreditByOriginalOrderBetween(
            @Param("from") Instant from, @Param("to") Instant to);
}
