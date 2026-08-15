-- ============================================================
-- V33: products.parent_id (biến thể / SP con) + products.sku
-- Guarded: tránh lỗi nếu cột đã tồn tại.
-- ============================================================

-- products.parent_id
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'parent_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN parent_id INT NULL AFTER category_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND CONSTRAINT_NAME = 'fk_products_parent'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE products
        ADD CONSTRAINT fk_products_parent
        FOREIGN KEY (parent_id) REFERENCES products(id)
        ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- products.sku
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'sku'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN sku VARCHAR(50) NULL AFTER barcode',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND INDEX_NAME = 'uk_products_sku'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE UNIQUE INDEX uk_products_sku ON products (sku)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
