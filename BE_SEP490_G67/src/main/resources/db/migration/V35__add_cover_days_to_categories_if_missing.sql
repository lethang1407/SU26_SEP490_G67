-- Ensure cover_days column exists in categories table
SET @col_exists := (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'categories' 
      AND COLUMN_NAME = 'cover_days'
);

SET @sql := IF(@col_exists = 0, 'ALTER TABLE categories ADD COLUMN cover_days INT NOT NULL DEFAULT 7', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
