package project.be_sep490_g67.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.PayosCheckoutSession;

import java.util.Optional;

@Repository
public interface PayosCheckoutSessionRepository extends JpaRepository<PayosCheckoutSession, Integer> {

    Optional<PayosCheckoutSession> findByPayosOrderCode(Long payosOrderCode);

    /**
     * Khóa hàng khi ghi sổ đơn: webhook của PayOS và nút "Thanh toán" của thu ngân
     * chạm vào cùng một phiên gần như đồng thời, không khóa thì một lần chuyển khoản
     * ghi ra được hai đơn.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM PayosCheckoutSession s WHERE s.payosOrderCode = :code")
    Optional<PayosCheckoutSession> lockByPayosOrderCode(@Param("code") Long code);
}
