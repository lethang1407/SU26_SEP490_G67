-- ============================================================
-- V7: URL ảnh hóa đơn / phiếu giao hàng (Cloudinary). Tùy chọn.
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_orders'
      AND COLUMN_NAME = 'invoice_image'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_orders ADD COLUMN invoice_image VARCHAR(500) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
