package project.be_sep490_g67.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateImportOrderRequest {

    @NotNull(message = "Nhà cung cấp không được để trống")
    Integer supplierId;

    LocalDate receivedDate;

    String note;

    @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng sản phẩm")
    @Valid
    List<ImportOrderItemRequest> items;

    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class ImportOrderItemRequest {

        @NotNull(message = "productId không được để trống")
        Integer productId;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng nhập phải lớn hơn 0")
        Integer quantity;

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = true, message = "Đơn giá không hợp lệ")
        BigDecimal costPerUnit;

        LocalDate expiryDate;

        /** Tùy chọn: xếp luôn lên kệ khi nhập */
        Integer locationId;
    }
}
