-- ============================================================
-- V42 — Nới các cột ghi chú từ TINYTEXT lên TEXT.
-- ============================================================

-- sales_orders.note
SET @is_tinytext := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'note'
      AND DATA_TYPE = 'tinytext'
);
SET @sql := IF(@is_tinytext > 0,
    'ALTER TABLE sales_orders MODIFY COLUMN note TEXT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- return_orders.note
SET @is_tinytext := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'note'
      AND DATA_TYPE = 'tinytext'
);
SET @sql := IF(@is_tinytext > 0,
    'ALTER TABLE return_orders MODIFY COLUMN note TEXT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- return_orders.return_reason — nhận cùng giá trị với note nên chịu cùng rủi ro
SET @is_tinytext := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'return_reason'
      AND DATA_TYPE = 'tinytext'
);
SET @sql := IF(@is_tinytext > 0,
    'ALTER TABLE return_orders MODIFY COLUMN return_reason TEXT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
