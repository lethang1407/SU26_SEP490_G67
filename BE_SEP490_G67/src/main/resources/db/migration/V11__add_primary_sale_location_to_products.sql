-- ============================================================
-- V11: Ô bán chính của sản phẩm (products.primary_sale_location_id).
-- Mỗi SP tối đa 1 ô; mỗi ô tối đa 1 SP (UNIQUE).
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'primary_sale_location_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN primary_sale_location_id INT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'fk_products_primary_sale_location'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE products ADD CONSTRAINT fk_products_primary_sale_location FOREIGN KEY (primary_sale_location_id) REFERENCES storage_locations (id) ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND INDEX_NAME = 'uk_products_primary_sale_location'
);
SET @sql := IF(@uq_exists = 0,
    'ALTER TABLE products ADD UNIQUE INDEX uk_products_primary_sale_location (primary_sale_location_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
