package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SettleImportTrialRequest {

    String note;

    /** Giảm giá trên tiền lô thử. Không âm, không vượt tổng phải trả. */
    @DecimalMin(value = "0.0", inclusive = true, message = "Giảm giá quyết toán không được âm")
    BigDecimal discountAmount;

    @DecimalMin(value = "0.0", inclusive = true, message = "Số tiền trả không được âm")
    BigDecimal paidAmount;

    String paymentMethod;

    @Valid
    @NotEmpty(message = "Cần quyết toán hết các dòng bán thử đang treo")
    List<Line> lines;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class Line {

        @NotNull(message = "importOrderDetailId không được để trống")
        Integer importOrderDetailId;

        /** Tồn đếm tay theo ĐVT cơ bản. Null = dùng tồn hệ thống. */
        Integer countedRemainingQty;

        /** Hàng hỏng / chuột cắn / bóc dở theo ĐVT cơ bản — không trả được NCC. */
        Integer unsellableQty;

        /**
         * PAY_SOLD_RETURN_REST: trả phần còn bán được, thu tiền phần đã bán + hỏng.
         * PAY_ALL_KEEP: giữ hết, thu tiền cả lô nhận.
         */
        @NotNull(message = "Quyết định quyết toán không được để trống")
        String decision;
    }
}
