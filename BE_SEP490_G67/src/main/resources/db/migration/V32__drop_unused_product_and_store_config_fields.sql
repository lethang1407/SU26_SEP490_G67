-- Migration V32: Xóa các trường thừa không còn sử dụng trong sản phẩm và cấu hình cửa hàng
-- 1. Bỏ vat_percent, brand, cover_days_override, product_img khỏi bảng products
-- 2. Bỏ default_cover_days khỏi bảng store_config

-- ---------- 1. Bảng products ----------
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'vat_percent'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE products DROP COLUMN vat_percent', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'brand'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE products DROP COLUMN brand', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'cover_days_override'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE products DROP COLUMN cover_days_override', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'product_img'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE products DROP COLUMN product_img', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 2. Bảng store_config ----------
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'default_cover_days'
);
SET @sql := IF(@col_exists > 0, 'ALTER TABLE store_config DROP COLUMN default_cover_days', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
