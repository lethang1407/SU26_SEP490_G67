-- ------------------------------------------------------------
-- V35: Add season_tag to products
--
-- Product.seasonTag is mapped to products.season_tag. Some existing
-- databases already applied V1 before that column was added there, so
-- Flyway will not rerun V1. Keep this migration idempotent for both cases.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'season_tag'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN season_tag VARCHAR(50) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
