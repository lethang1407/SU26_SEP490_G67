-- V80: Bổ sung kỳ tính thuế cho bảng tax_records cũ.

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'tax_records'
       AND column_name = 'period_type') = 0,
    'ALTER TABLE tax_records ADD COLUMN period_type VARCHAR(20) NOT NULL DEFAULT ''YEAR''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
