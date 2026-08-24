package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import project.be_sep490_g67.enums.PayosPaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Một lần thu ngân bấm "Chuyển khoản": giữ số tiền phải thu và QR tương ứng cho
 * tới khi PayOS báo tiền đã về.
 */
@Getter
@Setter
@Entity
@Table(name = "payos_checkout_sessions")
public class PayosCheckoutSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "payos_order_code", nullable = false, unique = true)
    private Long payosOrderCode;

    @Column(name = "payment_link_id", length = 64)
    private String paymentLinkId;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'PENDING'")
    @Column(name = "status", nullable = false, length = 20)
    private PayosPaymentStatus status = PayosPaymentStatus.PENDING;

    @Column(name = "checkout_url", length = 512)
    private String checkoutUrl;

    @Lob
    @Column(name = "qr_code")
    private String qrCode;

    @Column(name = "bin", length = 20)
    private String bin;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "account_name")
    private String accountName;

    @Column(name = "description")
    private String description;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "expired_at")
    private Instant expiredAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    /**
     * Lần cuối hỏi PayOS về phiên này. Dùng để giãn nhịp gọi ra ngoài: POS hỏi lại
     * mỗi vài giây.
     */
    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    /** Đơn bán đã ghi sổ từ phiên này. Khác null nghĩa là phiên đã dùng xong. */
    @Column(name = "sales_order_id")
    private Integer salesOrderId;
}
