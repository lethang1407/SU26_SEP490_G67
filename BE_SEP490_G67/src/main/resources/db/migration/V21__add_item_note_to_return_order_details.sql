-- ============================================================
-- V21: Ghi chú theo TỪNG DÒNG hàng trả, thay vì một ghi chú cho cả phiếu.
--
--     return_orders.return_reason là ghi chú cấp phiếu. Nó không trả lời
--     được câu hỏi mà kho thực sự cần khi hàng quay về: DÒNG NÀY vì sao
--     quay về? Một phiếu trả 3 món có thể có 1 món cận date, 1 món khách
--     đổi ý, 1 món hỏng bên trong mà nhìn ngoài không thấy — cả ba đều
--     rơi vào chung một ô text thì đọc xong vẫn không biết món nào là
--     món nào.
--
--     item_condition (V19) chỉ mô tả được 4 trạng thái cố định. Những lý
--     do nằm ngoài 4 trạng thái đó (cận date, bao bì móp, khách đổi ý)
--     không có chỗ ghi. Cột này là chỗ đó.
--
--     Guarded bằng information_schema, cùng kiểu với V19-V20.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'note'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN note VARCHAR(500) NULL AFTER item_condition',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
