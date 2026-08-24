package project.be_sep490_g67.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

/**
 * Một dòng trong danh sách hiện ra khi bấm "Hàng hết hạn" trên thẻ "Kho hàng". Danh sách
 * đi theo lô chứ không gộp theo sản phẩm: cùng một SP có thể có lô hết hạn và lô còn hạn,
 * gộp lại thì không biết phải bỏ lô nào.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExpiredBatchResponse {

    Integer productId;
    String productName;
    String productSku;

    Integer batchId;
    String batchCode;
    LocalDate expiryDate;

    /**
     * Số lượng thực sự còn lại của riêng lô đã hết hạn này. KHÔNG phải tổng tồn của sản
     * phẩm — đây là con số quyết định phải huỷ/trả bao nhiêu.
     */
    int expiredQuantity;

    /** Số ngày đã quá hạn = hôm nay − ngày hết hạn. */
    long daysOverdue;

    /** Tổng tồn của cả SP, chỉ để tham khảo thêm bên cạnh số lượng hết hạn. */
    int productTotalStock;
}
