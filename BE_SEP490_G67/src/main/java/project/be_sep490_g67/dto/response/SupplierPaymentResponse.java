package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Dùng chung cho cả 2 luồng: kết quả tạo 1 lần thanh toán (POST) và từng dòng
 * trong lịch sử thanh toán (GET) — cùng 1 hình dạng dữ liệu nên không cần 2 DTO riêng.
 * "remainingDebtAfter" luôn được derive ở Service, không lưu cache trên entity
 * SupplierPayment, để nhất quán với cách tính nợ NCC đã chốt cho toàn bộ luồng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SupplierPaymentResponse {
    Integer id;
    String paymentCode;
    Integer orderId;
    String orderCode;
    BigDecimal amount;
    String paymentMethod;
    LocalDateTime paymentDate;
    String note;
    BigDecimal remainingDebtAfter;
}
