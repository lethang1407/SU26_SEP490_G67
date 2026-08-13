-- ============================================================
-- V6: Giảm giá cả đơn + ghi chú dòng hàng trên phiếu nhập.
-- Guarded: Hibernate ddl-auto / lần migrate trước có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_orders'
      AND COLUMN_NAME = 'discount_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_orders ADD COLUMN discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'note'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_order_details ADD COLUMN note VARCHAR(500) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
