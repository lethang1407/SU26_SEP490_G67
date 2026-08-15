package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Payload từ màn Gợi ý nhập hàng: gom theo supplierId trên từng dòng → tạo nhiều phiếu DRAFT.
 * Không tăng tồn kho.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateDraftFromSuggestRequest {

    @NotEmpty(message = "Đơn nhập phải có ít nhất một dòng sản phẩm")
    @Valid
    List<OrderLine> lines;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class OrderLine {

        @NotNull(message = "productId không được để trống")
        Integer productId;

        @NotNull(message = "supplierId không được để trống")
        Integer supplierId;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        Integer quantity;

        @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá không được âm")
        BigDecimal costPerUnit;

        /** Chỉ dùng FE / cờ urgent — không persist. */
        Integer coverDays;

        /** Chỉ dùng FE / cờ urgent — không persist. */
        LocalDate orderDate;
    }
}
