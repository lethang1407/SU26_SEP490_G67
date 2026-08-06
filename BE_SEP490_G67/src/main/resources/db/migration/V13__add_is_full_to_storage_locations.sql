-- ============================================================
-- V13: Đánh dấu thủ công ô đã đầy (storage_locations.is_full).
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND COLUMN_NAME = 'is_full'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE storage_locations ADD COLUMN is_full TINYINT(1) NOT NULL DEFAULT 0 AFTER size',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE storage_locations
SET is_full = 0
WHERE is_full IS NULL;
