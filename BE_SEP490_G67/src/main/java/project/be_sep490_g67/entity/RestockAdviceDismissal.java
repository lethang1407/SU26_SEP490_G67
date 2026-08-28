package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Một lượt chủ cửa hàng bấm "Bỏ qua" trên widget gợi ý nhập hàng.
 *
 * <p>Bỏ qua chỉ có hiệu lực trong ngày ghi ở {@link #dismissedOn}: hôm sau widget
 * đánh giá lại từ đầu, sản phẩm còn thoả điều kiện thì hiện trở lại. Đây là bản ghi
 * "đã xem và bỏ qua", không phải cờ ẩn vĩnh viễn — nên khoá tự nhiên là cặp
 * (sản phẩm, ngày). Ai bỏ qua và lúc nào nằm ở {@code createdBy}/{@code createdAt}.
 */
@Getter
@Setter
@Entity
@Table(name = "restock_advice_dismissal")
public class RestockAdviceDismissal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Ngày bỏ qua, theo giờ cửa hàng (Asia/Ho_Chi_Minh). */
    @Column(name = "dismissed_on", nullable = false)
    private LocalDate dismissedOn;
}
