package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateInventoryCheckRequest {

    String warehouse;

    String note;

    /** Ngày kiểm kê (tuỳ chọn). Null = dùng thời điểm hiện tại. */
    LocalDate checkDate;

    @NotEmpty(message = "Phiếu kiểm kho phải có ít nhất một dòng")
    @Valid
    List<InventoryCheckLineRequest> lines;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class InventoryCheckLineRequest {

        @NotNull(message = "productId không được để trống")
        Integer productId;

        /** NULL = tất cả lô của SP */
        Integer stockBatchId;

        @NotNull(message = "Số lượng thực tế không được để trống")
        @Min(value = 0, message = "Số lượng thực tế không hợp lệ")
        Integer actualQty;

        /**
         * SL dùng để điều chỉnh tồn (nếu null thì dùng actualQty).
         * Dùng khi actualQty đã trừ phần trả/đổi NCC trên UI — tránh trừ tồn 2 lần.
         */
        Integer stockAdjustQty;

        String note;
    }
}
