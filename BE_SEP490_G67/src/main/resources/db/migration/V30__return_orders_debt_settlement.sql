-- ============================================================
-- V25 — Đổi/trả cho đơn nợ
--
-- Quyết định mở đổi/trả cho hoá đơn bán nợ. Nguyên tắc:
-- cấn trừ công nợ trước, phần thừa mới hoàn tiền mặt. Hệ quả là một phiếu trả
-- giờ có HAI con số tiền chứ không phải một, và refund_amount cũ không tách
-- được chúng.
--
-- Cùng lúc chốt A1: hạn đổi trả là 4 ngày.
-- ============================================================

-- ------------------------------------------------------------
-- 1. return_orders.debt_offset_amount + cash_refund_amount
--
-- refund_amount vẫn là TỔNG giá trị hàng khách trả về; hai cột mới chia tổng
-- đó thành phần trừ vào công nợ và phần thực sự ra khỏi két.
--
--     refund_amount = debt_offset_amount + cash_refund_amount   (đơn nợ)
--     refund_amount = cash_refund_amount, offset = 0            (đơn thường)
--
-- Lưu thay vì tính lại lúc in: sau khi khách trả thêm vài lần thì công nợ đã
-- khác, in lại phiếu cũ mà suy ngược sẽ ra số sai — đúng lỗi remainingDebt mà
-- InvoiceService từng mắc.
--
-- NULL = phiếu lập trước V25, chưa có khái niệm tách hai phần.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'debt_offset_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_orders ADD COLUMN debt_offset_amount DECIMAL(15,2) NULL AFTER refund_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'cash_refund_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_orders ADD COLUMN cash_refund_amount DECIMAL(15,2) NULL AFTER debt_offset_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2. Hạn đổi trả = 4 ngày  (quyết định A1, chốt 13/08/2026)
--
-- Hết hạn vào CUỐI ngày thứ 4 sau ngày mua, không phải đúng 96 giờ — xem
-- ExchangeOrderService.isReturnWindowExpired. Quá hạn là cấm hẳn, kể cả hàng
-- hỏng hay hết hạn (lối vượt rào cũ đã bị gỡ ở cùng đợt này).
--
-- Chỉ ghi đè giá trị 7 mà V17 đặt tạm. Cửa hàng nào đã tự chỉnh sang số khác
-- thì giữ nguyên lựa chọn của họ.
-- ------------------------------------------------------------

UPDATE store_config SET return_window_days = 4 WHERE return_window_days = 7;
