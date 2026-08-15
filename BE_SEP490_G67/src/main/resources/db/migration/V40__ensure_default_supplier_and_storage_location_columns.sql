-- 1. Ensure default_supplier_id column exists in categories table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'default_supplier_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE categories ADD COLUMN default_supplier_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure size column exists in storage_locations table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'storage_locations' AND COLUMN_NAME = 'size');
SET @sql := IF(@exist = 0, 'ALTER TABLE storage_locations ADD COLUMN size VARCHAR(10) NOT NULL DEFAULT ''MEDIUM''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Ensure is_full column exists in storage_locations table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'storage_locations' AND COLUMN_NAME = 'is_full');
SET @sql := IF(@exist = 0, 'ALTER TABLE storage_locations ADD COLUMN is_full BIT(1) NOT NULL DEFAULT b''0''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
