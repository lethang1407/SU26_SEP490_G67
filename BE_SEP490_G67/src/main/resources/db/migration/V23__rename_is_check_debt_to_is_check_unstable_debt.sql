SET @has_old := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'is_check_debt'
);
SET @has_new := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'is_check_unstable_debt'
);

-- CHANGE COLUMN thay vì RENAME COLUMN để chạy được cả trên MySQL < 8.0.
SET @sql := CASE
    WHEN @has_new > 0 THEN 'DO 0'
    WHEN @has_old > 0 THEN
        'ALTER TABLE sales_orders CHANGE COLUMN is_check_debt is_check_unstable_debt TINYINT(1) NOT NULL DEFAULT 0'
    ELSE
        'ALTER TABLE sales_orders ADD COLUMN is_check_unstable_debt TINYINT(1) NOT NULL DEFAULT 0 AFTER is_debt'
END;
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
