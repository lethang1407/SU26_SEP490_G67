-- ============================================================
-- V10: Kích thước ô kệ (SM | MD | LG) trên storage_locations.
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND COLUMN_NAME = 'size'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE storage_locations ADD COLUMN size VARCHAR(10) NULL AFTER description',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE storage_locations
SET size = 'MD'
WHERE size IS NULL OR size = '';

ALTER TABLE storage_locations
    MODIFY COLUMN size VARCHAR(10) NOT NULL DEFAULT 'MD';
