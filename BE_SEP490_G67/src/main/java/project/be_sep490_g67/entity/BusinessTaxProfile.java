package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import project.be_sep490_g67.enums.ProfileStatus;
import project.be_sep490_g67.enums.DeclaredMethod;
import project.be_sep490_g67.enums.InvoiceRegistrationStatus;

/**
 * Hồ sơ thuế từng năm của cửa hàng. Kỳ kế toán thuộc hồ sơ này; không lưu doanh thu lịch sử.
 * StoreService quản lý nháp/xác nhận và đồng bộ mốc giữa các năm dưới khóa cửa hàng.
 */
@Getter
@Setter
@Entity
@Table(name = "business_tax_profiles", uniqueConstraints = {
    @UniqueConstraint(name = "uk_business_tax_profile_year", columnNames = {"store_id", "tax_year"})
})
public class BusinessTaxProfile extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private StoreConfig store;

    @Column(name = "tax_year", nullable = false)
    private Integer taxYear;

    /**
     * Ngày cửa hàng thực tế bắt đầu dùng hệ thống, thống nhất giữa các hồ sơ năm.
     * Hồ sơ năm sau sao chép mốc đã xác nhận, không reset về 01/01.
     * NULL chỉ dành cho nháp chưa thiết lập mốc đầu tiên. StoreService kiểm tra:
     * không ở tương lai/sau năm hồ sơ; đổi mốc qua thao tác riêng, audit và đồng bộ các hồ sơ.
     * Có kỳ đóng thì chặn đổi mốc cho đến khi xử lý ảnh hưởng; annotation không tự thực thi quy tắc.
     */
    @Column(name = "tracking_started_at")
    private Instant trackingStartedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "declared_method", nullable = false, length = 30)
    private DeclaredMethod declaredMethod = DeclaredMethod.UNKNOWN;

    @Column(name = "taxpayer_identity", length = 30)
    private String taxpayerIdentity;

    @Column(name = "taxpayer_name", length = 200)
    private String taxpayerName;

    @Column(name = "taxpayer_address", length = 500)
    private String taxpayerAddress;

    @Column(name = "tax_authority", length = 255)
    private String taxAuthority;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_registration_status", nullable = false, length = 30)
    private InvoiceRegistrationStatus invoiceRegistrationStatus = InvoiceRegistrationStatus.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProfileStatus status = ProfileStatus.DRAFT;

    @Column(name = "confirmed_by")
    private Integer confirmedBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    /** Khóa lạc quan; không phải số phiên bản hồ sơ xuất. */
    @Version @Column(nullable = false)
    private Long version = 0L;
}
