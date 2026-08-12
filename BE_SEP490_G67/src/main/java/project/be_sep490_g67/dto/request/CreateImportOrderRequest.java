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

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateImportOrderRequest {

    @NotNull(message = "Nhà cung cấp không được để trống")
    Integer supplierId;

    /** DRAFT | IMPORTED */
    @NotNull(message = "Trạng thái phiếu không được để trống")
    String orderStatus;

    String note;

    /** URL ảnh hóa đơn / phiếu giao hàng (Cloudinary). Tùy chọn. */
    String invoiceImage;

    @DecimalMin(value = "0.0", inclusive = true, message = "Giảm giá không được âm")
    BigDecimal discountAmount;

    /** Số tiền trả NCC ngay khi hoàn thành phiếu (chỉ áp dụng khi IMPORTED). */
    @DecimalMin(value = "0.0", inclusive = true, message = "Số tiền trả không được âm")
    BigDecimal paidAmount;

    String paymentMethod;

    @NotEmpty(message = "Phiếu nhập phải có ít nhất một sản phẩm")
    @Valid
    List<LineItem> lines;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class LineItem {

        @NotNull(message = "productId không được để trống")
        Integer productId;

        /** ĐVT chọn trên phiếu; null → BE dùng đơn vị cơ bản (unit_base = 1). */
        Integer productUnitId;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        Integer quantity;

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá không được âm")
        BigDecimal costPerUnit;

        LocalDate expiryDate;

        String note;

        /**
         * true = hàng KM / trả thưởng: lineTotal = 0, vẫn nhập kho.
         * null được coi là false.
         */
        Boolean isPromotion;
    }
}
