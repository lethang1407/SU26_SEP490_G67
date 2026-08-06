-- ============================================================
-- V15: Đánh dấu dòng hàng khuyến mại / trả thưởng
-- (không thu tiền, vẫn nhập kho).
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'is_promotion'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_order_details ADD COLUMN is_promotion TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = hàng KM/trả thưởng, không tính vào tổng thanh toán''',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
