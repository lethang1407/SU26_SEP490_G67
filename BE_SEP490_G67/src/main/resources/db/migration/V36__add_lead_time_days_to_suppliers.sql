-- Ensure lead_time_days column exists in suppliers table
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'suppliers'
      AND COLUMN_NAME = 'lead_time_days'
);

SET @sql := IF(@col_exists = 0, 'ALTER TABLE suppliers ADD COLUMN lead_time_days INT NOT NULL DEFAULT 3', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
