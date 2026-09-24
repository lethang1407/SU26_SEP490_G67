-- V79: Bổ sung hạn kê khai cho tax_records ở các database đã tồn tại bảng cũ.

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'tax_records'
       AND column_name = 'due_date') = 0,
    'ALTER TABLE tax_records ADD COLUMN due_date DATE NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
