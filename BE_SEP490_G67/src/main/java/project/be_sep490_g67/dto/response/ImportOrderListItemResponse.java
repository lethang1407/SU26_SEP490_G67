package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ImportOrderListItemResponse {
    Integer id;
    String orderCode;
    LocalDate receivedDate;
    String createdByName;
    BigDecimal totalCost;
    // "DEBT" (đang nợ) hoặc "DONE" (hoàn thành) — derive từ totalCost - tổng đã trả,
    // xem ImportOrderService.resolveStatus()
    String status;
    // paidAmount/remainingDebt cũng derive từ SupplierPayment (không cache) — thêm 2 field
    // này để modal "Thanh toán nợ" hiển thị đúng số liệu thật khi chọn đơn, thay vì phải
    // tự bịa ở FE như trước.
    BigDecimal paidAmount;
    BigDecimal remainingDebt;
}
