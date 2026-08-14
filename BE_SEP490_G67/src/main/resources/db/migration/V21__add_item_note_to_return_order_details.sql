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
--     Không dùng AFTER item_condition: một số DB có V19 recorded nhưng
--     cột chưa tồn tại (ddl-auto / migrate lệch) → Error 1054.
-- ============================================================

-- Self-heal: đảm bảo item_condition có trước (idempotent với V19).
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'item_condition'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN item_condition VARCHAR(20) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE return_order_details
SET item_condition = 'RESELLABLE'
WHERE item_condition IS NULL;

SET @nullable := (
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'item_condition'
);
SET @sql := IF(@nullable = 'YES',
    'ALTER TABLE return_order_details MODIFY COLUMN item_condition VARCHAR(20) NOT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'note'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN note VARCHAR(500) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
