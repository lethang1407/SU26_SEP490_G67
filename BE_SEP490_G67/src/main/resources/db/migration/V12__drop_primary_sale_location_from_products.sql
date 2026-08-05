-- ============================================================
-- V12: Rollback ô bán chính (products.primary_sale_location_id).
-- Drop mọi FK trên cột (Hibernate có thể đặt tên khác V11),
-- rồi mới drop index / column.
-- ============================================================

-- Drop FK lần 1 (tên do V11 hoặc Hibernate)
SET @fk_name := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.TABLE_NAME = 'products'
      AND kcu.COLUMN_NAME = 'primary_sale_location_id'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);
SET @sql := IF(@fk_name IS NOT NULL,
    CONCAT('ALTER TABLE products DROP FOREIGN KEY `', @fk_name, '`'),
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop FK lần 2 nếu còn (tên khác)
SET @fk_name := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.TABLE_NAME = 'products'
      AND kcu.COLUMN_NAME = 'primary_sale_location_id'
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);
SET @sql := IF(@fk_name IS NOT NULL,
    CONCAT('ALTER TABLE products DROP FOREIGN KEY `', @fk_name, '`'),
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop unique / index trên cột (nếu còn)
SET @uq_name := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = DATABASE()
      AND s.TABLE_NAME = 'products'
      AND s.COLUMN_NAME = 'primary_sale_location_id'
      AND s.INDEX_NAME <> 'PRIMARY'
    LIMIT 1
);
SET @sql := IF(@uq_name IS NOT NULL,
    CONCAT('ALTER TABLE products DROP INDEX `', @uq_name, '`'),
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop cột
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'primary_sale_location_id'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE products DROP COLUMN primary_sale_location_id',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
